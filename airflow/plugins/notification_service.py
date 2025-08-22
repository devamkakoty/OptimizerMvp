"""
GreenMatrix Notification Service

This module handles all notification delivery mechanisms including
email, Slack, Discord, Microsoft Teams, and webhook integrations.
"""

import requests
import smtplib
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import json
import os
from airflow.models import Variable
from airflow.hooks.base import BaseHook

from .alert_templates import EmailTemplate, SlackTemplate, WebhookTemplate

class NotificationService:
    """Central notification service for GreenMatrix monitoring"""
    
    def __init__(self):
        self.email_template = EmailTemplate()
        self.slack_template = SlackTemplate()
        self.webhook_template = WebhookTemplate()
        
        # Load configuration from Airflow Variables or environment
        self.config = self._load_configuration()
        
        # Track notification history to prevent spam
        self.notification_history = {}
    
    def _load_configuration(self) -> Dict[str, Any]:
        """Load notification configuration from Airflow Variables"""
        config = {
            'email': {
                'enabled': True,
                'smtp_host': self._get_config_value('smtp_host', 'localhost'),
                'smtp_port': int(self._get_config_value('smtp_port', '587')),
                'smtp_user': self._get_config_value('smtp_user', ''),
                'smtp_password': self._get_config_value('smtp_password', ''),
                'smtp_use_tls': self._get_config_value('smtp_use_tls', 'true').lower() == 'true',
                'from_email': self._get_config_value('from_email', 'admin@greenmatrix.com'),
                'to_emails': self._get_config_value('alert_emails', 'admin@greenmatrix.com').split(',')
            },
            'slack': {
                'enabled': self._get_config_value('slack_enabled', 'false').lower() == 'true',
                'webhook_url': self._get_config_value('slack_webhook_url', ''),
                'channel': self._get_config_value('slack_channel', '#greenmatrix-alerts'),
                'username': self._get_config_value('slack_username', 'GreenMatrix Monitor')
            },
            'discord': {
                'enabled': self._get_config_value('discord_enabled', 'false').lower() == 'true',
                'webhook_url': self._get_config_value('discord_webhook_url', '')
            },
            'teams': {
                'enabled': self._get_config_value('teams_enabled', 'false').lower() == 'true',
                'webhook_url': self._get_config_value('teams_webhook_url', '')
            },
            'webhooks': {
                'enabled': self._get_config_value('webhooks_enabled', 'false').lower() == 'true',
                'endpoints': self._load_webhook_endpoints()
            },
            'rate_limiting': {
                'max_emails_per_hour': int(self._get_config_value('max_emails_per_hour', '10')),
                'max_slack_per_hour': int(self._get_config_value('max_slack_per_hour', '20')),
                'min_interval_critical': int(self._get_config_value('min_interval_critical', '300')),  # 5 minutes
                'min_interval_high': int(self._get_config_value('min_interval_high', '900')),  # 15 minutes
                'min_interval_medium': int(self._get_config_value('min_interval_medium', '3600'))  # 1 hour
            }
        }
        
        return config
    
    def _get_config_value(self, key: str, default: str = '') -> str:
        """Get configuration value from Airflow Variables or environment"""
        try:
            # Try Airflow Variable first
            return Variable.get(key, default_var=None)
        except:
            # Fall back to environment variable
            return os.getenv(key.upper(), default)
    
    def _load_webhook_endpoints(self) -> List[Dict[str, str]]:
        """Load custom webhook endpoints from configuration"""
        try:
            webhook_config = self._get_config_value('webhook_endpoints', '[]')
            return json.loads(webhook_config)
        except:
            return []
    
    def send_alert(self, dashboard_data: Dict[str, Any], force: bool = False) -> Dict[str, bool]:
        """Send alert through all configured channels"""
        
        results = {
            'email': False,
            'slack': False,
            'discord': False,
            'teams': False,
            'webhooks': False
        }
        
        alert_level = dashboard_data['overall_status']
        
        # Check rate limiting unless forced
        if not force and self._should_rate_limit(alert_level):
            logging.info(f"Rate limiting applied for {alert_level} alert")
            return results
        
        # Send notifications based on severity and configuration
        if dashboard_data['summary']['critical_alerts'] > 0 or alert_level == 'CRITICAL':
            # Critical alerts go to all channels
            results['email'] = self._send_email_notification(dashboard_data)
            results['slack'] = self._send_slack_notification(dashboard_data)
            results['discord'] = self._send_discord_notification(dashboard_data)
            results['teams'] = self._send_teams_notification(dashboard_data)
            results['webhooks'] = self._send_webhook_notifications(dashboard_data)
            
        elif dashboard_data['summary']['high_alerts'] > 0 or alert_level == 'HIGH':
            # High priority alerts go to email and Slack
            results['email'] = self._send_email_notification(dashboard_data)
            results['slack'] = self._send_slack_notification(dashboard_data)
            results['webhooks'] = self._send_webhook_notifications(dashboard_data)
            
        elif alert_level in ['MEDIUM', 'LOW']:
            # Medium/Low alerts go to Slack only
            results['slack'] = self._send_slack_notification(dashboard_data)
        
        # Update notification history
        self._update_notification_history(alert_level)
        
        return results
    
    def _should_rate_limit(self, alert_level: str) -> bool:
        """Check if notification should be rate limited"""
        now = datetime.now()
        history_key = f"{alert_level}_{now.strftime('%Y-%m-%d_%H')}"
        
        # Get rate limits
        rate_limits = self.config['rate_limiting']
        
        if alert_level == 'CRITICAL':
            min_interval = rate_limits['min_interval_critical']
        elif alert_level == 'HIGH':
            min_interval = rate_limits['min_interval_high']
        else:
            min_interval = rate_limits['min_interval_medium']
        
        # Check if enough time has passed since last notification of this level
        last_notification = self.notification_history.get(alert_level)
        if last_notification:
            time_diff = (now - last_notification).total_seconds()
            if time_diff < min_interval:
                return True
        
        return False
    
    def _update_notification_history(self, alert_level: str):
        """Update notification history"""
        self.notification_history[alert_level] = datetime.now()
    
    def _send_email_notification(self, dashboard_data: Dict[str, Any]) -> bool:
        """Send email notification"""
        if not self.config['email']['enabled']:
            logging.info("Email notifications disabled")
            return False
        
        try:
            email_data = self.email_template.generate_alert_email(dashboard_data)
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = email_data['subject']
            msg['From'] = self.config['email']['from_email']
            msg['To'] = ', '.join(self.config['email']['to_emails'])
            
            # Add priority header for critical alerts
            if dashboard_data['overall_status'] == 'CRITICAL':
                msg['X-Priority'] = '1'
                msg['X-MSMail-Priority'] = 'High'
            
            # Add both text and HTML parts
            text_part = MIMEText(email_data['text_content'], 'plain', 'utf-8')
            html_part = MIMEText(email_data['html_content'], 'html', 'utf-8')
            
            msg.attach(text_part)
            msg.attach(html_part)
            
            # Send email
            if self.config['email']['smtp_user']:
                # Authenticated SMTP
                server = smtplib.SMTP(self.config['email']['smtp_host'], self.config['email']['smtp_port'])
                if self.config['email']['smtp_use_tls']:
                    server.starttls()
                server.login(self.config['email']['smtp_user'], self.config['email']['smtp_password'])
                server.send_message(msg)
                server.quit()
            else:
                # Unauthenticated SMTP (for local testing)
                server = smtplib.SMTP(self.config['email']['smtp_host'], self.config['email']['smtp_port'])
                server.send_message(msg)
                server.quit()
            
            logging.info(f"Email alert sent to {len(self.config['email']['to_emails'])} recipients")
            return True
            
        except Exception as e:
            logging.error(f"Failed to send email notification: {e}")
            return False
    
    def _send_slack_notification(self, dashboard_data: Dict[str, Any]) -> bool:
        """Send Slack notification"""
        if not self.config['slack']['enabled'] or not self.config['slack']['webhook_url']:
            logging.info("Slack notifications disabled or webhook URL not configured")
            return False
        
        try:
            message = self.slack_template.generate_slack_message(dashboard_data)
            
            response = requests.post(
                self.config['slack']['webhook_url'],
                json=message,
                timeout=10
            )
            response.raise_for_status()
            
            logging.info("Slack notification sent successfully")
            return True
            
        except Exception as e:
            logging.error(f"Failed to send Slack notification: {e}")
            return False
    
    def _send_discord_notification(self, dashboard_data: Dict[str, Any]) -> bool:
        """Send Discord notification"""
        if not self.config['discord']['enabled'] or not self.config['discord']['webhook_url']:
            logging.info("Discord notifications disabled or webhook URL not configured")
            return False
        
        try:
            message = self.webhook_template.generate_webhook_payload(dashboard_data, 'discord')
            
            response = requests.post(
                self.config['discord']['webhook_url'],
                json=message,
                timeout=10
            )
            response.raise_for_status()
            
            logging.info("Discord notification sent successfully")
            return True
            
        except Exception as e:
            logging.error(f"Failed to send Discord notification: {e}")
            return False
    
    def _send_teams_notification(self, dashboard_data: Dict[str, Any]) -> bool:
        """Send Microsoft Teams notification"""
        if not self.config['teams']['enabled'] or not self.config['teams']['webhook_url']:
            logging.info("Teams notifications disabled or webhook URL not configured")
            return False
        
        try:
            message = self.webhook_template.generate_webhook_payload(dashboard_data, 'teams')
            
            response = requests.post(
                self.config['teams']['webhook_url'],
                json=message,
                timeout=10
            )
            response.raise_for_status()
            
            logging.info("Teams notification sent successfully")
            return True
            
        except Exception as e:
            logging.error(f"Failed to send Teams notification: {e}")
            return False
    
    def _send_webhook_notifications(self, dashboard_data: Dict[str, Any]) -> bool:
        """Send notifications to custom webhook endpoints"""
        if not self.config['webhooks']['enabled'] or not self.config['webhooks']['endpoints']:
            logging.info("Webhook notifications disabled or no endpoints configured")
            return False
        
        success_count = 0
        total_endpoints = len(self.config['webhooks']['endpoints'])
        
        for endpoint in self.config['webhooks']['endpoints']:
            try:
                payload = self.webhook_template.generate_webhook_payload(
                    dashboard_data, 
                    endpoint.get('type', 'generic')
                )
                
                headers = endpoint.get('headers', {})
                headers.setdefault('Content-Type', 'application/json')
                
                response = requests.post(
                    endpoint['url'],
                    json=payload,
                    headers=headers,
                    timeout=endpoint.get('timeout', 10)
                )
                response.raise_for_status()
                
                success_count += 1
                logging.info(f"Webhook notification sent to {endpoint['url']}")
                
            except Exception as e:
                logging.error(f"Failed to send webhook notification to {endpoint.get('url', 'unknown')}: {e}")
        
        logging.info(f"Webhook notifications: {success_count}/{total_endpoints} successful")
        return success_count > 0
    
    def send_daily_summary(self, dashboard_data: Dict[str, Any]) -> Dict[str, bool]:
        """Send daily health summary"""
        results = {
            'email': False,
            'slack': False
        }
        
        try:
            # Send summary to Slack
            if self.config['slack']['enabled'] and self.config['slack']['webhook_url']:
                summary_message = self.slack_template.generate_health_summary_message(dashboard_data)
                response = requests.post(
                    self.config['slack']['webhook_url'],
                    json=summary_message,
                    timeout=10
                )
                response.raise_for_status()
                results['slack'] = True
                logging.info("Daily summary sent to Slack")
            
            # Send summary email if requested
            summary_emails = self._get_config_value('daily_summary_emails', '').split(',')
            if summary_emails and summary_emails[0]:
                # Create simplified email for daily summary
                simplified_data = dashboard_data.copy()
                simplified_data['system_alerts'] = [
                    a for a in dashboard_data['system_alerts'] 
                    if a['level'] in ['CRITICAL', 'HIGH']
                ]
                
                email_data = self.email_template.generate_alert_email(simplified_data)
                email_data['subject'] = f"📊 GreenMatrix Daily Health Summary - {dashboard_data['overall_status']}"
                
                # Send to summary email list
                msg = MIMEMultipart('alternative')
                msg['Subject'] = email_data['subject']
                msg['From'] = self.config['email']['from_email']
                msg['To'] = ', '.join(summary_emails)
                
                text_part = MIMEText(email_data['text_content'], 'plain', 'utf-8')
                html_part = MIMEText(email_data['html_content'], 'html', 'utf-8')
                
                msg.attach(text_part)
                msg.attach(html_part)
                
                # Send the summary email
                if self.config['email']['smtp_user']:
                    server = smtplib.SMTP(self.config['email']['smtp_host'], self.config['email']['smtp_port'])
                    if self.config['email']['smtp_use_tls']:
                        server.starttls()
                    server.login(self.config['email']['smtp_user'], self.config['email']['smtp_password'])
                    server.send_message(msg)
                    server.quit()
                
                results['email'] = True
                logging.info(f"Daily summary email sent to {len(summary_emails)} recipients")
            
        except Exception as e:
            logging.error(f"Failed to send daily summary: {e}")
        
        return results
    
    def test_notifications(self) -> Dict[str, bool]:
        """Test all notification channels"""
        test_dashboard_data = {
            'timestamp': datetime.now(),
            'overall_health_score': 95,
            'overall_status': 'INFO',
            'system_alerts': [{
                'level': 'INFO',
                'category': 'Test',
                'message': 'This is a test notification',
                'details': 'Testing notification system',
                'action_required': 'No action required - this is a test'
            }],
            'summary': {
                'total_dags': 5,
                'healthy_dags': 5,
                'warning_dags': 0,
                'critical_dags': 0,
                'total_alerts': 1,
                'critical_alerts': 0,
                'high_alerts': 0
            },
            'dag_health': {}
        }
        
        logging.info("Testing all notification channels...")
        results = self.send_alert(test_dashboard_data, force=True)
        
        for channel, success in results.items():
            if success:
                logging.info(f"✅ {channel.title()} notification test: SUCCESS")
            else:
                logging.warning(f"❌ {channel.title()} notification test: FAILED")
        
        return results

# Global notification service instance
notification_service = NotificationService()
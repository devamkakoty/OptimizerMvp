"""
GreenMatrix Alert Templates and Notification Utilities

This module provides templates and utilities for generating consistent
alerts and notifications across the monitoring system.
"""

from datetime import datetime
from typing import Dict, List, Any, Optional
import json
import logging

class AlertTemplate:
    """Base class for alert templates"""
    
    @staticmethod
    def format_timestamp(timestamp: datetime) -> str:
        """Format timestamp for display"""
        return timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")
    
    @staticmethod
    def get_status_emoji(status: str) -> str:
        """Get emoji for status"""
        emojis = {
            'CRITICAL': '🚨',
            'HIGH': '⚠️',
            'MEDIUM': '⚡',
            'LOW': 'ℹ️',
            'INFO': '✅',
            'SUCCESS': '✅',
            'WARNING': '⚠️',
            'ERROR': '❌',
            'UNKNOWN': '❓'
        }
        return emojis.get(status.upper(), '📊')
    
    @staticmethod
    def get_status_color(status: str) -> str:
        """Get color code for status"""
        colors = {
            'CRITICAL': '#FF0000',
            'HIGH': '#FF8C00',
            'MEDIUM': '#FFD700',
            'LOW': '#32CD32',
            'INFO': '#00BFFF',
            'SUCCESS': '#32CD32',
            'WARNING': '#FFD700',
            'ERROR': '#FF0000',
            'UNKNOWN': '#808080'
        }
        return colors.get(status.upper(), '#808080')

class EmailTemplate(AlertTemplate):
    """Email notification templates"""
    
    @classmethod
    def generate_alert_email(cls, dashboard_data: Dict[str, Any]) -> Dict[str, str]:
        """Generate comprehensive alert email"""
        
        overall_status = dashboard_data['overall_status']
        health_score = dashboard_data['overall_health_score']
        timestamp = dashboard_data['timestamp']
        
        # Determine email type and subject
        critical_count = dashboard_data['summary']['critical_alerts']
        high_count = dashboard_data['summary']['high_alerts']
        
        if critical_count > 0:
            subject = f"🚨 CRITICAL: GreenMatrix System Alert - {critical_count} Critical Issues"
            priority = "Critical"
        elif high_count > 0:
            subject = f"⚠️ HIGH: GreenMatrix System Alert - {high_count} High Priority Issues"
            priority = "High"
        else:
            subject = f"📊 GreenMatrix System Status - Health Score: {health_score}/100"
            priority = "Medium"
        
        # Generate HTML content
        html_content = cls._generate_html_email(dashboard_data, priority)
        
        # Generate plain text content
        text_content = cls._generate_text_email(dashboard_data, priority)
        
        return {
            'subject': subject,
            'html_content': html_content,
            'text_content': text_content,
            'priority': priority
        }
    
    @classmethod
    def _generate_html_email(cls, dashboard_data: Dict[str, Any], priority: str) -> str:
        """Generate HTML email content"""
        
        status_color = cls.get_status_color(dashboard_data['overall_status'])
        status_emoji = cls.get_status_emoji(dashboard_data['overall_status'])
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>GreenMatrix System Alert</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f5f5f5;
                }}
                .container {{
                    background-color: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                }}
                .header {{
                    background-color: {status_color};
                    color: white;
                    padding: 30px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                }}
                .header p {{
                    margin: 10px 0 0 0;
                    font-size: 18px;
                    opacity: 0.9;
                }}
                .content {{
                    padding: 30px;
                }}
                .summary {{
                    background-color: #f8f9fa;
                    border-radius: 6px;
                    padding: 20px;
                    margin: 20px 0;
                    border-left: 4px solid {status_color};
                }}
                .summary h2 {{
                    margin: 0 0 15px 0;
                    color: #2c3e50;
                }}
                .metrics-grid {{
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 15px;
                    margin: 20px 0;
                }}
                .metric-card {{
                    background-color: #fff;
                    border: 1px solid #e1e8ed;
                    border-radius: 6px;
                    padding: 15px;
                    text-align: center;
                }}
                .metric-value {{
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }}
                .metric-label {{
                    color: #657786;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }}
                .alert {{
                    margin: 15px 0;
                    padding: 15px;
                    border-radius: 6px;
                    border-left: 4px solid;
                }}
                .alert-critical {{
                    background-color: #ffebee;
                    border-color: #f44336;
                }}
                .alert-high {{
                    background-color: #fff3e0;
                    border-color: #ff9800;
                }}
                .alert-medium {{
                    background-color: #fffde7;
                    border-color: #ffc107;
                }}
                .alert h3 {{
                    margin: 0 0 10px 0;
                    color: #2c3e50;
                }}
                .alert p {{
                    margin: 5px 0;
                }}
                .dag-status {{
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 15px;
                    margin: 20px 0;
                }}
                .dag-card {{
                    background-color: #fff;
                    border: 1px solid #e1e8ed;
                    border-radius: 6px;
                    padding: 15px;
                }}
                .dag-card h4 {{
                    margin: 0 0 10px 0;
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }}
                .footer {{
                    background-color: #f8f9fa;
                    padding: 20px;
                    text-align: center;
                    border-top: 1px solid #e1e8ed;
                    color: #657786;
                }}
                .footer a {{
                    color: #1da1f2;
                    text-decoration: none;
                }}
                .action-required {{
                    background-color: #e3f2fd;
                    border-left: 4px solid #2196f3;
                    padding: 15px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{status_emoji} GreenMatrix System Alert</h1>
                    <p>Status: {dashboard_data['overall_status']} | Health Score: {dashboard_data['overall_health_score']}/100</p>
                    <p>Generated: {cls.format_timestamp(dashboard_data['timestamp'])}</p>
                </div>
                
                <div class="content">
                    <div class="summary">
                        <h2>Executive Summary</h2>
                        <div class="metrics-grid">
                            <div class="metric-card">
                                <div class="metric-value" style="color: {status_color};">{dashboard_data['overall_health_score']}</div>
                                <div class="metric-label">Health Score</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value">{dashboard_data['summary']['total_alerts']}</div>
                                <div class="metric-label">Total Alerts</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value">{dashboard_data['summary']['healthy_dags']}/{dashboard_data['summary']['total_dags']}</div>
                                <div class="metric-label">Healthy DAGs</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value">{dashboard_data['summary']['critical_alerts']}</div>
                                <div class="metric-label">Critical Issues</div>
                            </div>
                        </div>
                    </div>
        """
        
        # Add critical alerts
        critical_alerts = [a for a in dashboard_data['system_alerts'] if a['level'] == 'CRITICAL']
        if critical_alerts:
            html += """
                    <h2>🚨 Critical Issues (Immediate Action Required)</h2>
            """
            for alert in critical_alerts:
                html += f"""
                    <div class="alert alert-critical">
                        <h3>{alert['category']}: {alert['message']}</h3>
                        <p><strong>Details:</strong> {alert['details']}</p>
                        <div class="action-required">
                            <strong>Action Required:</strong> {alert['action_required']}
                        </div>
                    </div>
                """
        
        # Add high priority alerts
        high_alerts = [a for a in dashboard_data['system_alerts'] if a['level'] == 'HIGH']
        if high_alerts:
            html += """
                    <h2>⚠️ High Priority Issues</h2>
            """
            for alert in high_alerts:
                html += f"""
                    <div class="alert alert-high">
                        <h3>{alert['category']}: {alert['message']}</h3>
                        <p><strong>Details:</strong> {alert['details']}</p>
                        <p><strong>Action Required:</strong> {alert['action_required']}</p>
                    </div>
                """
        
        # Add DAG status overview
        html += """
                    <h2>📊 Monitoring DAG Status</h2>
                    <div class="dag-status">
        """
        
        for dag_id, status in dashboard_data['dag_health'].items():
            status_emoji = cls.get_status_emoji(status['status'])
            dag_name = dag_id.replace('greenmatrix_', '').replace('_', ' ').title()
            
            html += f"""
                        <div class="dag-card">
                            <h4>{status_emoji} {dag_name}</h4>
                            <p><strong>Status:</strong> {status['status']}</p>
                            <p><strong>Health Score:</strong> {status['health_score']}/100</p>
                            <p><strong>Tasks:</strong> {len(status['success_tasks'])} success, {len(status['failed_tasks'])} failed</p>
                            <p><strong>Last Run:</strong> {status['last_run'] or 'Never'}</p>
                        </div>
            """
        
        html += """
                    </div>
                </div>
                
                <div class="footer">
                    <p>
                        <strong>Next Steps:</strong><br>
                        • Review the <a href="http://localhost:8080">Airflow Dashboard</a> for detailed logs<br>
                        • Check the <a href="http://localhost:3000">GreenMatrix Dashboard</a> for system metrics<br>
                        • Contact the development team if issues persist
                    </p>
                    <p style="margin-top: 20px;">
                        This is an automated alert from the GreenMatrix monitoring system.<br>
                        Report generated at {cls.format_timestamp(dashboard_data['timestamp'])}
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html
    
    @classmethod
    def _generate_text_email(cls, dashboard_data: Dict[str, Any], priority: str) -> str:
        """Generate plain text email content"""
        
        status_emoji = cls.get_status_emoji(dashboard_data['overall_status'])
        
        text = f"""
{status_emoji} GREENMATRIX SYSTEM ALERT {status_emoji}

Status: {dashboard_data['overall_status']}
Health Score: {dashboard_data['overall_health_score']}/100
Generated: {cls.format_timestamp(dashboard_data['timestamp'])}

SUMMARY:
- Total Alerts: {dashboard_data['summary']['total_alerts']}
- Critical Issues: {dashboard_data['summary']['critical_alerts']}
- High Priority Issues: {dashboard_data['summary']['high_alerts']}
- DAG Health: {dashboard_data['summary']['healthy_dags']}/{dashboard_data['summary']['total_dags']} healthy

"""
        
        # Add critical alerts
        critical_alerts = [a for a in dashboard_data['system_alerts'] if a['level'] == 'CRITICAL']
        if critical_alerts:
            text += "CRITICAL ISSUES (IMMEDIATE ACTION REQUIRED):\n"
            text += "=" * 50 + "\n"
            for i, alert in enumerate(critical_alerts, 1):
                text += f"{i}. {alert['category']}: {alert['message']}\n"
                text += f"   Details: {alert['details']}\n"
                text += f"   Action: {alert['action_required']}\n\n"
        
        # Add high priority alerts
        high_alerts = [a for a in dashboard_data['system_alerts'] if a['level'] == 'HIGH']
        if high_alerts:
            text += "HIGH PRIORITY ISSUES:\n"
            text += "=" * 25 + "\n"
            for i, alert in enumerate(high_alerts, 1):
                text += f"{i}. {alert['category']}: {alert['message']}\n"
                text += f"   Details: {alert['details']}\n"
                text += f"   Action: {alert['action_required']}\n\n"
        
        # Add DAG status
        text += "MONITORING DAG STATUS:\n"
        text += "=" * 25 + "\n"
        for dag_id, status in dashboard_data['dag_health'].items():
            dag_name = dag_id.replace('greenmatrix_', '').replace('_', ' ').title()
            status_emoji = cls.get_status_emoji(status['status'])
            text += f"{status_emoji} {dag_name}: {status['status']} (Score: {status['health_score']}/100)\n"
        
        text += f"""

NEXT STEPS:
- Review Airflow Dashboard: http://localhost:8080
- Check GreenMatrix Dashboard: http://localhost:3000
- Contact development team if issues persist

---
This is an automated alert from GreenMatrix monitoring system.
Generated at {cls.format_timestamp(dashboard_data['timestamp'])}
"""
        
        return text

class SlackTemplate(AlertTemplate):
    """Slack notification templates"""
    
    @classmethod
    def generate_slack_message(cls, dashboard_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate Slack message payload"""
        
        overall_status = dashboard_data['overall_status']
        status_emoji = cls.get_status_emoji(overall_status)
        status_color = cls.get_status_color(overall_status)
        
        # Main message
        main_text = f"{status_emoji} *GreenMatrix System Status: {overall_status}*\nOverall Health Score: {dashboard_data['overall_health_score']}/100"
        
        # Build attachment fields
        fields = [
            {
                "title": "DAG Status",
                "value": f"✅ {dashboard_data['summary']['healthy_dags']} Healthy\n⚠️ {dashboard_data['summary']['warning_dags']} Warning\n🚨 {dashboard_data['summary']['critical_dags']} Critical",
                "short": True
            },
            {
                "title": "System Alerts",
                "value": f"🚨 {dashboard_data['summary']['critical_alerts']} Critical\n⚠️ {dashboard_data['summary']['high_alerts']} High\n📊 {dashboard_data['summary']['total_alerts']} Total",
                "short": True
            }
        ]
        
        # Add critical alerts if any
        critical_alerts = [a for a in dashboard_data['system_alerts'] if a['level'] == 'CRITICAL']
        if critical_alerts:
            alert_text = "\n".join([f"• *{alert['category']}*: {alert['message']}" for alert in critical_alerts[:3]])
            if len(critical_alerts) > 3:
                alert_text += f"\n... and {len(critical_alerts) - 3} more"
            
            fields.append({
                "title": "🚨 Critical Issues",
                "value": alert_text,
                "short": False
            })
        
        message = {
            "channel": "#greenmatrix-alerts",
            "username": "GreenMatrix Monitor",
            "icon_emoji": ":chart_with_upwards_trend:",
            "text": main_text,
            "attachments": [
                {
                    "color": status_color,
                    "fields": fields,
                    "footer": "GreenMatrix Monitoring System",
                    "footer_icon": "https://example.com/icon.png",
                    "ts": int(dashboard_data['timestamp'].timestamp())
                }
            ]
        }
        
        return message
    
    @classmethod
    def generate_health_summary_message(cls, dashboard_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate daily health summary for Slack"""
        
        status_emoji = cls.get_status_emoji(dashboard_data['overall_status'])
        
        message = {
            "channel": "#greenmatrix-status",
            "username": "GreenMatrix Health Bot",
            "icon_emoji": ":heart:",
            "text": f"{status_emoji} *Daily GreenMatrix Health Summary*",
            "attachments": [
                {
                    "color": "#36a64f" if dashboard_data['overall_health_score'] > 80 else "#ff9800",
                    "fields": [
                        {
                            "title": "Overall Health Score",
                            "value": f"{dashboard_data['overall_health_score']}/100",
                            "short": True
                        },
                        {
                            "title": "System Status",
                            "value": dashboard_data['overall_status'],
                            "short": True
                        },
                        {
                            "title": "Monitoring Coverage",
                            "value": f"{dashboard_data['summary']['total_dags']} DAGs monitoring system health",
                            "short": True
                        },
                        {
                            "title": "Issues Today",
                            "value": f"{dashboard_data['summary']['total_alerts']} alerts ({dashboard_data['summary']['critical_alerts']} critical)",
                            "short": True
                        }
                    ],
                    "footer": "Daily automated health report",
                    "ts": int(dashboard_data['timestamp'].timestamp())
                }
            ]
        }
        
        return message

class WebhookTemplate(AlertTemplate):
    """Generic webhook templates for integration with other systems"""
    
    @classmethod
    def generate_webhook_payload(cls, dashboard_data: Dict[str, Any], webhook_type: str = "generic") -> Dict[str, Any]:
        """Generate webhook payload for external systems"""
        
        base_payload = {
            "timestamp": dashboard_data['timestamp'].isoformat(),
            "source": "greenmatrix-monitoring",
            "version": "1.0",
            "system_status": {
                "overall_health_score": dashboard_data['overall_health_score'],
                "overall_status": dashboard_data['overall_status'],
                "summary": dashboard_data['summary']
            },
            "alerts": dashboard_data['system_alerts'],
            "dag_health": dashboard_data['dag_health']
        }
        
        if webhook_type == "teams":
            return cls._format_for_teams(base_payload, dashboard_data)
        elif webhook_type == "discord":
            return cls._format_for_discord(base_payload, dashboard_data)
        else:
            return base_payload
    
    @classmethod
    def _format_for_teams(cls, base_payload: Dict[str, Any], dashboard_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format for Microsoft Teams webhook"""
        
        status_color = cls.get_status_color(dashboard_data['overall_status'])
        
        teams_payload = {
            "@type": "MessageCard",
            "@context": "https://schema.org/extensions",
            "summary": f"GreenMatrix System Alert - {dashboard_data['overall_status']}",
            "themeColor": status_color.replace('#', ''),
            "sections": [
                {
                    "activityTitle": f"GreenMatrix System Status: {dashboard_data['overall_status']}",
                    "activitySubtitle": f"Health Score: {dashboard_data['overall_health_score']}/100",
                    "facts": [
                        {"name": "Total Alerts", "value": str(dashboard_data['summary']['total_alerts'])},
                        {"name": "Critical Issues", "value": str(dashboard_data['summary']['critical_alerts'])},
                        {"name": "Healthy DAGs", "value": f"{dashboard_data['summary']['healthy_dags']}/{dashboard_data['summary']['total_dags']}"},
                        {"name": "Generated", "value": cls.format_timestamp(dashboard_data['timestamp'])}
                    ]
                }
            ],
            "potentialAction": [
                {
                    "@type": "OpenUri",
                    "name": "View Airflow Dashboard",
                    "targets": [
                        {"os": "default", "uri": "http://localhost:8080"}
                    ]
                }
            ]
        }
        
        return teams_payload
    
    @classmethod
    def _format_for_discord(cls, base_payload: Dict[str, Any], dashboard_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format for Discord webhook"""
        
        status_emoji = cls.get_status_emoji(dashboard_data['overall_status'])
        status_color = int(cls.get_status_color(dashboard_data['overall_status']).replace('#', ''), 16)
        
        discord_payload = {
            "username": "GreenMatrix Monitor",
            "avatar_url": "https://example.com/greenmatrix-avatar.png",
            "embeds": [
                {
                    "title": f"{status_emoji} GreenMatrix System Alert",
                    "description": f"System Status: **{dashboard_data['overall_status']}**\nHealth Score: **{dashboard_data['overall_health_score']}/100**",
                    "color": status_color,
                    "fields": [
                        {
                            "name": "📊 Summary",
                            "value": f"Total Alerts: {dashboard_data['summary']['total_alerts']}\nCritical: {dashboard_data['summary']['critical_alerts']}\nHealthy DAGs: {dashboard_data['summary']['healthy_dags']}/{dashboard_data['summary']['total_dags']}",
                            "inline": True
                        }
                    ],
                    "timestamp": dashboard_data['timestamp'].isoformat(),
                    "footer": {
                        "text": "GreenMatrix Monitoring System"
                    }
                }
            ]
        }
        
        # Add critical alerts as separate embed if any
        critical_alerts = [a for a in dashboard_data['system_alerts'] if a['level'] == 'CRITICAL']
        if critical_alerts:
            for alert in critical_alerts[:3]:  # Limit to 3 to avoid hitting Discord limits
                discord_payload["embeds"].append({
                    "title": f"🚨 Critical: {alert['category']}",
                    "description": f"**{alert['message']}**\n\n{alert['details']}\n\n**Action Required:** {alert['action_required']}",
                    "color": 0xFF0000,  # Red color for critical
                    "timestamp": dashboard_data['timestamp'].isoformat()
                })
        
        return discord_payload
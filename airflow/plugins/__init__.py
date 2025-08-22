"""
GreenMatrix Airflow Plugins

This package contains custom plugins and utilities for the GreenMatrix
monitoring and alerting system.
"""

from .alert_templates import EmailTemplate, SlackTemplate, WebhookTemplate, AlertTemplate
from .notification_service import NotificationService, notification_service

__all__ = [
    'AlertTemplate',
    'EmailTemplate', 
    'SlackTemplate',
    'WebhookTemplate',
    'NotificationService',
    'notification_service'
]

__version__ = '1.0.0'
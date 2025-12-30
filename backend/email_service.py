"""
Email Service for ECU Flash Service
Uses Hostinger SMTP to send emails from support@ecuflashservice.com
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# SMTP Configuration
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.hostinger.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "support@ecuflashservice.com")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", "support@ecuflashservice.com")
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "ECU Flash Service")


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    attachments: Optional[List[dict]] = None
) -> bool:
    """
    Send an email using Hostinger SMTP
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML body of the email
        text_content: Plain text alternative (optional)
        attachments: List of dicts with 'filename' and 'path' keys (optional)
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add text part (fallback)
        if text_content:
            text_part = MIMEText(text_content, 'plain')
            msg.attach(text_part)
        
        # Add HTML part
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Add attachments if any
        if attachments:
            for attachment in attachments:
                filepath = Path(attachment.get('path', ''))
                if filepath.exists():
                    with open(filepath, 'rb') as f:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(f.read())
                    encoders.encode_base64(part)
                    filename = attachment.get('filename', filepath.name)
                    part.add_header('Content-Disposition', f'attachment; filename="{filename}"')
                    msg.attach(part)
        
        # Send email via SMTP
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM_EMAIL, to_email, msg.as_string())
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


async def send_order_confirmation(
    customer_email: str,
    customer_name: str,
    order_id: str,
    order_details: dict
) -> bool:
    """Send order confirmation email (async wrapper)"""
    
    vehicle_info = order_details.get('vehicle_info', 'N/A')
    services = order_details.get('services', [])
    total_amount = order_details.get('total_amount', 0)
    
    services_html = "".join([f"<li>{s}</li>" for s in services])
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #2563eb, #0891b2); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .order-box {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }}
            .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
            .btn {{ display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Order Confirmed!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your order</p>
            </div>
            <div class="content">
                <p>Hi {customer_name},</p>
                <p>We've received your order and our team is now working on processing your ECU file.</p>
                
                <div class="order-box">
                    <h3 style="margin-top: 0; color: #2563eb;">Order Details</h3>
                    <p><strong>Order ID:</strong> {order_id}</p>
                    <p><strong>Vehicle:</strong> {vehicle_info}</p>
                    <p><strong>Services:</strong></p>
                    <ul>{services_html}</ul>
                    <p style="font-size: 18px; margin-bottom: 0;"><strong>Total:</strong> ${total_amount:.2f}</p>
                </div>
                
                <h3>What's Next?</h3>
                <p>Your file will be processed within <strong>20-60 minutes</strong>. We'll send you another email when your modified file is ready for download.</p>
                
                <p>You can check your order status anytime:</p>
                <a href="https://ecuflashservice.com/portal" class="btn">Check Order Status</a>
                
                <p style="margin-top: 30px;">If you have any questions, simply reply to this email.</p>
                <p>Best regards,<br><strong>ECU Flash Service Team</strong></p>
            </div>
            <div class="footer">
                <p>ECU Flash Service | Professional ECU Tuning Solutions</p>
                <p>This email was sent to {customer_email}</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(
        to_email=customer_email,
        subject=f"Order Confirmed - {order_id}",
        html_content=html_content
    )


async def send_download_ready_email(
    customer_email: str,
    customer_name: str,
    order_id: str,
    download_links: list
) -> bool:
    """Send notification when processed file is ready (async wrapper)"""
    
    links_html = ""
    for link in download_links:
        links_html += f'<li><a href="{link["url"]}" style="color: #2563eb;">{link["name"]}</a></li>'
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .download-box {{ background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border: 2px solid #10b981; text-align: center; }}
            .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
            .btn {{ display: inline-block; background: #10b981; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Your File is Ready! 🎉</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Download your processed ECU file</p>
            </div>
            <div class="content">
                <p>Hi {customer_name},</p>
                <p>Great news! Your ECU file has been processed and is ready for download.</p>
                
                <div class="download-box">
                    <p style="margin: 0 0 15px 0; color: #6b7280;">Order: {order_id}</p>
                    <h3>Download Links:</h3>
                    <ul style="list-style: none; padding: 0;">{links_html}</ul>
                </div>
                
                <h3>Installation Tips:</h3>
                <ul>
                    <li>Always backup your original file before flashing</li>
                    <li>Use a reliable ECU programming tool</li>
                    <li>Ensure stable power supply during flashing</li>
                    <li>If you encounter any issues, contact us immediately</li>
                </ul>
                
                <p style="margin-top: 30px;">Thank you for choosing ECU Flash Service!</p>
                <p>Best regards,<br><strong>ECU Flash Service Team</strong></p>
            </div>
            <div class="footer">
                <p>ECU Flash Service | Professional ECU Tuning Solutions</p>
                <p>This email was sent to {customer_email}</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(
        to_email=customer_email,
        subject=f"Your ECU File is Ready - {order_id}",
        html_content=html_content
    )


def send_dtc_delete_confirmation(
    to_email: str,
    customer_name: str,
    order_id: str,
    dtcs_deleted: List[str],
    total_amount: float,
    download_link: str
) -> bool:
    """Send DTC deletion confirmation email"""
    
    dtc_list_html = "".join([f"<li><code style='background:#fee2e2;color:#dc2626;padding:2px 6px;border-radius:4px;'>{dtc}</code></li>" for dtc in dtcs_deleted])
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #ef4444, #f97316); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .dtc-box {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }}
            .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
            .btn {{ display: inline-block; background: #10b981; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">DTC Deletion Complete! 🔧</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your file has been processed</p>
            </div>
            <div class="content">
                <p>Hi {customer_name},</p>
                <p>Your DTC deletion request has been completed successfully.</p>
                
                <div class="dtc-box">
                    <h3 style="margin-top: 0; color: #ef4444;">DTCs Deleted</h3>
                    <ul>{dtc_list_html}</ul>
                    <p><strong>Total:</strong> ${total_amount:.2f}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{download_link}" class="btn">Download Modified File</a>
                </div>
                
                <p><strong>Note:</strong> Checksum has been automatically corrected.</p>
                
                <p style="margin-top: 30px;">If you have any questions, simply reply to this email.</p>
                <p>Best regards,<br><strong>ECU Flash Service Team</strong></p>
            </div>
            <div class="footer">
                <p>ECU Flash Service | Professional ECU Tuning Solutions</p>
                <p>This email was sent to {to_email}</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(
        to_email=to_email,
        subject=f"DTC Deletion Complete - {order_id}",
        html_content=html_content
    )


def send_contact_notification(
    customer_name: str,
    customer_email: str,
    subject: str,
    message: str
) -> bool:
    """Send notification to support about a new contact form submission"""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .message-box {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">New Contact Form Submission</h2>
            </div>
            <div class="content">
                <p><strong>From:</strong> {customer_name} ({customer_email})</p>
                <p><strong>Subject:</strong> {subject}</p>
                
                <div class="message-box">
                    <h3 style="margin-top: 0;">Message:</h3>
                    <p>{message}</p>
                </div>
                
                <p><a href="mailto:{customer_email}">Reply to {customer_email}</a></p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(
        to_email=SMTP_FROM_EMAIL,
        subject=f"Contact Form: {subject}",
        html_content=html_content
    )


# Test function
def test_email_connection() -> bool:
    """Test SMTP connection"""
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
        logger.info("SMTP connection test successful")
        return True
    except Exception as e:
        logger.error(f"SMTP connection test failed: {e}")
        return False


def send_order_notification_to_support(
    order_id: str,
    customer_name: str,
    customer_email: str,
    vehicle_info: str,
    services: list,
    total_amount: float,
    source: str = "Website"
) -> bool:
    """Send notification to support@ecuflashservice.com when a new order is placed"""
    
    services_html = "".join([f"<li>{s}</li>" for s in services])
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .order-box {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }}
            .highlight {{ background: #fef3c7; padding: 10px; border-radius: 6px; margin: 10px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">💰 New Order Received!</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">From: {source}</p>
            </div>
            <div class="content">
                <div class="highlight">
                    <strong>Order ID:</strong> {order_id}<br>
                    <strong>Total:</strong> ${total_amount:.2f}
                </div>
                
                <div class="order-box">
                    <h3 style="margin-top: 0; color: #2563eb;">Customer Details</h3>
                    <p><strong>Name:</strong> {customer_name}</p>
                    <p><strong>Email:</strong> <a href="mailto:{customer_email}">{customer_email}</a></p>
                </div>
                
                <div class="order-box">
                    <h3 style="margin-top: 0; color: #2563eb;">Order Details</h3>
                    <p><strong>Vehicle:</strong> {vehicle_info}</p>
                    <p><strong>Services:</strong></p>
                    <ul>{services_html}</ul>
                </div>
                
                <p style="text-align: center;">
                    <a href="https://ecuflashservice.com/admin" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">
                        View in Admin Panel
                    </a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(
        to_email=SMTP_FROM_EMAIL,  # support@ecuflashservice.com
        subject=f"🆕 New Order #{order_id[:8]} - ${total_amount:.2f}",
        html_content=html_content
    )


def send_portal_message_notification(
    customer_name: str,
    customer_email: str,
    order_id: str,
    message: str
) -> bool:
    """Send notification to support when a customer sends a message in the portal"""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #8b5cf6; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .message-box {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">💬 New Customer Message</h2>
            </div>
            <div class="content">
                <p><strong>From:</strong> {customer_name} ({customer_email})</p>
                <p><strong>Order ID:</strong> {order_id}</p>
                
                <div class="message-box">
                    <h3 style="margin-top: 0;">Message:</h3>
                    <p>{message}</p>
                </div>
                
                <p style="text-align: center;">
                    <a href="mailto:{customer_email}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">
                        Reply to Customer
                    </a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(
        to_email=SMTP_FROM_EMAIL,  # support@ecuflashservice.com
        subject=f"💬 Message from {customer_name} - Order #{order_id[:8]}",
        html_content=html_content
    )


def generate_invoice_html(
    order_id: str,
    customer_name: str,
    customer_email: str,
    vehicle_info: str,
    services: list,
    service_prices: list,
    total_amount: float,
    payment_status: str,
    created_at: str
) -> str:
    """Generate HTML invoice for an order"""
    
    import datetime
    
    services_rows = ""
    for i, service in enumerate(services):
        price = service_prices[i] if i < len(service_prices) else 0
        services_rows += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{service}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${price:.2f}</td>
        </tr>
        """
    
    invoice_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; color: #333; margin: 0; padding: 20px; }}
            .invoice {{ max-width: 800px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }}
            .invoice-header {{ background: linear-gradient(135deg, #2563eb, #0891b2); color: white; padding: 30px; }}
            .invoice-body {{ padding: 30px; }}
            .invoice-title {{ font-size: 28px; margin: 0; }}
            .invoice-meta {{ display: flex; justify-content: space-between; margin-top: 30px; }}
            .invoice-meta-col {{ }}
            .invoice-table {{ width: 100%; border-collapse: collapse; margin: 30px 0; }}
            .invoice-table th {{ background: #f3f4f6; padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; }}
            .invoice-table td {{ padding: 12px; border-bottom: 1px solid #e5e7eb; }}
            .invoice-total {{ font-size: 24px; text-align: right; margin-top: 20px; }}
            .invoice-footer {{ background: #f9fafb; padding: 20px 30px; text-align: center; font-size: 12px; color: #6b7280; }}
            .status-paid {{ color: #10b981; font-weight: bold; }}
            .status-pending {{ color: #f59e0b; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="invoice">
            <div class="invoice-header">
                <h1 class="invoice-title">INVOICE</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">ECU Flash Service</p>
            </div>
            <div class="invoice-body">
                <div class="invoice-meta">
                    <div class="invoice-meta-col">
                        <h3 style="margin: 0 0 10px 0; color: #6b7280;">Bill To:</h3>
                        <p style="margin: 0;"><strong>{customer_name}</strong></p>
                        <p style="margin: 5px 0;">{customer_email}</p>
                    </div>
                    <div class="invoice-meta-col" style="text-align: right;">
                        <p style="margin: 0;"><strong>Invoice #:</strong> {order_id[:12].upper()}</p>
                        <p style="margin: 5px 0;"><strong>Date:</strong> {created_at}</p>
                        <p style="margin: 5px 0;"><strong>Status:</strong> 
                            <span class="{'status-paid' if payment_status == 'paid' else 'status-pending'}">
                                {payment_status.upper()}
                            </span>
                        </p>
                    </div>
                </div>
                
                <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px;">
                    <strong>Vehicle:</strong> {vehicle_info}
                </div>
                
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>Service</th>
                            <th style="text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services_rows}
                    </tbody>
                </table>
                
                <div class="invoice-total">
                    <strong>Total: ${total_amount:.2f} USD</strong>
                </div>
            </div>
            <div class="invoice-footer">
                <p>ECU Flash Service | support@ecuflashservice.com</p>
                <p>Thank you for your business!</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return invoice_html

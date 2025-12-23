"""
Email Service for ECU Flash Service
Sends order confirmations and download links via SendGrid
"""

import os
import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content, HtmlContent

logger = logging.getLogger(__name__)

# SendGrid configuration
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'admin@ecuflashservice.com')
SENDER_NAME = os.environ.get('SENDER_NAME', 'ECU Flash Service')


def send_order_confirmation(
    customer_email: str,
    customer_name: str,
    order_id: str,
    order_details: dict
) -> bool:
    """
    Send order confirmation email with download links
    
    Args:
        customer_email: Customer's email address
        customer_name: Customer's name
        order_id: Order ID
        order_details: Dict containing order info (services, vehicle, download_links, etc.)
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    
    # Build email content
    html_content = build_order_email_html(
        customer_name=customer_name,
        order_id=order_id,
        order_details=order_details
    )
    
    # If no API key, log the email instead of sending
    if not SENDGRID_API_KEY:
        logger.warning("SENDGRID_API_KEY not set. Email would be sent to: %s", customer_email)
        logger.info("Email content preview:\n%s", html_content[:500] + "...")
        return False
    
    try:
        message = Mail(
            from_email=Email(SENDER_EMAIL, SENDER_NAME),
            to_emails=To(customer_email),
            subject=f"Your ECU File is Ready - Order #{order_id[:8]}",
            html_content=HtmlContent(html_content)
        )
        
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        
        if response.status_code in [200, 201, 202]:
            logger.info("Email sent successfully to %s for order %s", customer_email, order_id)
            return True
        else:
            logger.error("Failed to send email. Status: %s", response.status_code)
            return False
            
    except Exception as e:
        logger.error("Error sending email: %s", str(e))
        return False


def build_order_email_html(customer_name: str, order_id: str, order_details: dict) -> str:
    """Build HTML email content for order confirmation"""
    
    # Extract order details
    services = order_details.get('purchased_services', [])
    total_price = order_details.get('total_price', 0)
    vehicle_make = order_details.get('vehicle_make', 'N/A')
    vehicle_model = order_details.get('vehicle_model', 'N/A')
    vehicle_year = order_details.get('vehicle_year', 'N/A')
    dtc_codes = order_details.get('dtc_codes', [])
    download_links = order_details.get('download_links', [])
    file_id = order_details.get('file_id', '')
    base_url = os.environ.get('BASE_URL', 'https://ecuflashservice.com')
    
    # Build services list HTML
    services_html = ""
    for service in services:
        service_name = service.get('service_name', 'Service')
        price = service.get('price', 0)
        services_html += f"""
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">{service_name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${price:.2f}</td>
        </tr>
        """
    
    # Build download links HTML
    downloads_html = ""
    for i, link in enumerate(download_links):
        service_id = link if isinstance(link, str) else link.get('service_id', f'file_{i}')
        service_name = next((s.get('service_name', service_id) for s in services if s.get('service_id') == service_id), service_id)
        download_url = f"{base_url}/api/download-purchased/{file_id}/{service_id}"
        downloads_html += f"""
        <tr>
            <td style="padding: 12px;">
                <a href="{download_url}" style="color: #2563eb; text-decoration: none; font-weight: 600;">
                    📥 Download {service_name}
                </a>
            </td>
        </tr>
        """
    
    # Build DTC codes section if applicable
    dtc_html = ""
    if dtc_codes:
        dtc_list = ", ".join(dtc_codes)
        dtc_html = f"""
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0 0 8px 0; color: #92400e;">DTC Codes to Remove:</h3>
            <p style="margin: 0; font-family: monospace; font-size: 16px; color: #78350f;">{dtc_list}</p>
        </div>
        """
    
    # Complete HTML email template
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔧 ECU Flash Service</h1>
                <p style="color: #94a3b8; margin: 10px 0 0 0;">Your processed files are ready!</p>
            </div>
            
            <!-- Main Content -->
            <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <h2 style="color: #1e3a5f; margin-top: 0;">Hi {customer_name},</h2>
                
                <p style="color: #4b5563; line-height: 1.6;">
                    Thank you for your order! Your ECU files have been processed and are ready for download.
                </p>
                
                <!-- Order Info -->
                <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0; color: #64748b; font-size: 14px;">Order ID</p>
                    <p style="margin: 4px 0 0 0; color: #1e3a5f; font-weight: 600; font-family: monospace;">{order_id}</p>
                </div>
                
                <!-- Vehicle Info -->
                <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <h3 style="margin: 0 0 8px 0; color: #0369a1;">Vehicle Information</h3>
                    <p style="margin: 0; color: #0c4a6e;">
                        <strong>{vehicle_year} {vehicle_make} {vehicle_model}</strong>
                    </p>
                </div>
                
                {dtc_html}
                
                <!-- Services Table -->
                <h3 style="color: #1e3a5f; margin-bottom: 12px;">Services Purchased:</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background-color: #f1f5f9;">
                            <th style="padding: 12px; text-align: left; color: #475569;">Service</th>
                            <th style="padding: 12px; text-align: right; color: #475569;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services_html}
                        <tr style="background-color: #1e3a5f;">
                            <td style="padding: 12px; color: #ffffff; font-weight: 600;">Total Paid</td>
                            <td style="padding: 12px; color: #22c55e; font-weight: 700; text-align: right; font-size: 18px;">${total_price:.2f}</td>
                        </tr>
                    </tbody>
                </table>
                
                <!-- Download Section -->
                <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #ffffff; margin: 0 0 16px 0; text-align: center;">📥 Download Your Files</h3>
                    <table style="width: 100%; background-color: #ffffff; border-radius: 8px;">
                        <tbody>
                            {downloads_html}
                        </tbody>
                    </table>
                </div>
                
                <!-- Important Notes -->
                <div style="background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <h4 style="margin: 0 0 8px 0; color: #dc2626;">⚠️ Important Notes:</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #7f1d1d;">
                        <li>Keep your original ECU file as backup</li>
                        <li>Test on vehicle before permanent installation</li>
                        <li>For off-road and racing use only</li>
                        <li>Download links expire in 30 days</li>
                    </ul>
                </div>
                
                <!-- Support -->
                <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
                    Need help? Reply to this email or contact us at<br>
                    <a href="mailto:admin@ecuflashservice.com" style="color: #2563eb;">admin@ecuflashservice.com</a>
                </p>
                
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
                <p style="margin: 0;">© 2024 ECU Flash Service | AI-Powered ECU Processing</p>
                <p style="margin: 8px 0 0 0;">For off-road and racing use only</p>
            </div>
            
        </div>
    </body>
    </html>
    """
    
    return html

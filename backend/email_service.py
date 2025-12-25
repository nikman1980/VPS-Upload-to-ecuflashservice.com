"""
Email Service for ECU Flash Service
Sends order confirmations and download links via Resend
"""

import os
import asyncio
import logging
import resend
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Resend configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
SENDER_NAME = os.environ.get('SENDER_NAME', 'ECU Flash Service')

# Initialize Resend
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


async def send_order_confirmation(
    customer_email: str,
    customer_name: str,
    order_id: str,
    order_details: dict
) -> bool:
    """
    Send order confirmation email with download links (async)
    
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
    
    # Determine subject based on status
    is_completed = order_details.get('processing_complete', False)
    if is_completed:
        subject = f"✅ Your ECU File is Ready - Order #{order_id[:8]}"
    else:
        subject = f"⏳ Order Received - Processing Started #{order_id[:8]}"
    
    # If no API key, log the email instead of sending
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set. Email would be sent to: %s", customer_email)
        logger.info("Subject: %s", subject)
        logger.info("Email content preview:\n%s", html_content[:500] + "...")
        return False
    
    try:
        params = {
            "from": f"{SENDER_NAME} <{SENDER_EMAIL}>",
            "to": [customer_email],
            "subject": subject,
            "html": html_content
        }
        
        # Run sync SDK in thread to keep FastAPI non-blocking
        email_response = await asyncio.to_thread(resend.Emails.send, params)
        
        email_id = email_response.get("id") if isinstance(email_response, dict) else getattr(email_response, 'id', None)
        
        if email_id:
            logger.info("Email sent successfully to %s for order %s (email_id: %s)", customer_email, order_id, email_id)
            return True
        else:
            logger.error("Failed to send email - no email ID returned")
            return False
            
    except Exception as e:
        logger.error("Error sending email: %s", str(e))
        return False


def send_order_confirmation_sync(
    customer_email: str,
    customer_name: str,
    order_id: str,
    order_details: dict
) -> bool:
    """
    Synchronous version of send_order_confirmation for use in non-async contexts
    """
    
    # Build email content
    html_content = build_order_email_html(
        customer_name=customer_name,
        order_id=order_id,
        order_details=order_details
    )
    
    # Determine subject based on status
    is_completed = order_details.get('processing_complete', False)
    if is_completed:
        subject = f"✅ Your ECU File is Ready - Order #{order_id[:8]}"
    else:
        subject = f"⏳ Order Received - Processing Started #{order_id[:8]}"
    
    # If no API key, log the email instead of sending
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set. Email would be sent to: %s", customer_email)
        logger.info("Subject: %s", subject)
        return False
    
    try:
        params = {
            "from": f"{SENDER_NAME} <{SENDER_EMAIL}>",
            "to": [customer_email],
            "subject": subject,
            "html": html_content
        }
        
        email_response = resend.Emails.send(params)
        
        email_id = email_response.get("id") if isinstance(email_response, dict) else getattr(email_response, 'id', None)
        
        if email_id:
            logger.info("Email sent successfully to %s for order %s (email_id: %s)", customer_email, order_id, email_id)
            return True
        else:
            logger.error("Failed to send email - no email ID returned")
            return False
            
    except Exception as e:
        logger.error("Error sending email: %s", str(e))
        return False


def build_order_email_html(customer_name: str, order_id: str, order_details: dict) -> str:
    """Build HTML email content for order confirmation"""
    
    # Extract order details
    services = order_details.get('purchased_services', [])
    total_price = order_details.get('total_price', 0)
    
    # Vehicle info - support both old and new format
    vehicle_info = order_details.get('vehicle_info', {})
    if isinstance(vehicle_info, dict) and vehicle_info:
        vehicle_make = vehicle_info.get('manufacturer', 'N/A')
        vehicle_model = vehicle_info.get('model', 'N/A')
        vehicle_year = vehicle_info.get('generation', 'N/A')
        vehicle_engine = vehicle_info.get('engine', '')
    else:
        vehicle_make = order_details.get('vehicle_make', 'N/A')
        vehicle_model = order_details.get('vehicle_model', 'N/A')
        vehicle_year = order_details.get('vehicle_year', 'N/A')
        vehicle_engine = order_details.get('engine_type', '')
    
    dtc_codes = order_details.get('dtc_codes', [])
    download_links = order_details.get('download_links', [])
    base_url = os.environ.get('BASE_URL', 'https://ecuflashservice.com')
    
    # Check if this is a "processing" notification or "completed" notification
    is_processing = order_details.get('processing_status') == 'processing'
    is_completed = order_details.get('processing_complete', False)
    estimated_time = order_details.get('estimated_time', '20-60 minutes')
    
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
    
    # Build download links HTML (only if completed)
    downloads_html = ""
    if is_completed and download_links:
        for i, link in enumerate(download_links):
            if isinstance(link, str) and link:
                download_url = f"{base_url}/api/download-order/{link}"
                downloads_html += f"""
                <tr>
                    <td style="padding: 12px;">
                        <a href="{download_url}" style="color: #ffffff; text-decoration: none; font-weight: 600; background-color: #059669; padding: 12px 24px; border-radius: 8px; display: inline-block;">
                            📥 Download Your Processed File
                        </a>
                    </td>
                </tr>
                """
    
    # Build DTC codes section if applicable
    dtc_html = ""
    if dtc_codes:
        dtc_list = ", ".join(dtc_codes) if isinstance(dtc_codes, list) else str(dtc_codes)
        dtc_html = f"""
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0 0 8px 0; color: #92400e;">DTC Codes to Remove:</h3>
            <p style="margin: 0; font-family: monospace; font-size: 16px; color: #78350f;">{dtc_list}</p>
        </div>
        """
    
    # Set header and intro text based on status
    if is_completed:
        header_text = "Your processed file is ready!"
        intro_text = "Great news! Your ECU file has been processed and is ready for download."
        status_banner = """
        <div style="background-color: #059669; padding: 16px; text-align: center; margin-bottom: 20px; border-radius: 8px;">
            <span style="color: #ffffff; font-size: 18px; font-weight: 600;">✅ Processing Complete - Ready for Download</span>
        </div>
        """
    else:
        header_text = "Order Received - Processing Started"
        intro_text = f"Thank you for your order! Your ECU file has been submitted for processing. Estimated time: <strong>{estimated_time}</strong>"
        status_banner = """
        <div style="background-color: #f59e0b; padding: 16px; text-align: center; margin-bottom: 20px; border-radius: 8px;">
            <span style="color: #ffffff; font-size: 18px; font-weight: 600;">⏳ Processing Your File - Please Wait 20-60 Minutes</span>
        </div>
        """
    
    # Vehicle display string
    vehicle_display = f"{vehicle_make} {vehicle_model} {vehicle_year}"
    if vehicle_engine:
        vehicle_display += f" - {vehicle_engine}"
    
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
                <p style="color: #94a3b8; margin: 10px 0 0 0;">{header_text}</p>
            </div>
            
            <!-- Main Content -->
            <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                {status_banner}
                
                <h2 style="color: #1e3a5f; margin-top: 0;">Hi {customer_name},</h2>
                
                <p style="color: #4b5563; line-height: 1.6;">
                    {intro_text}
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
                        <strong>{vehicle_display}</strong>
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
                
                {"" if not is_completed else f'''
                <!-- Download Section (only shown when completed) -->
                <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                    <h3 style="color: #ffffff; margin: 0 0 16px 0;">📥 Download Your Processed File</h3>
                    <table style="width: 100%; background-color: #ffffff; border-radius: 8px;">
                        <tbody>
                            {downloads_html}
                        </tbody>
                    </table>
                </div>
                '''}
                
                {"" if is_completed else f'''
                <!-- Customer Portal Access -->
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                    <h3 style="color: #ffffff; margin: 0 0 12px 0;">📋 Track Your Order</h3>
                    <p style="color: #e0f2fe; margin: 0 0 16px 0;">Access your Customer Portal to check status, upload files, and communicate with our team.</p>
                    <a href="{base_url}/portal?order={order_id}&email={order_details.get("customer_email", "")}" style="background-color: #ffffff; color: #1e3a8a; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; display: inline-block;">
                        Go to Customer Portal →
                    </a>
                </div>
                
                <!-- Processing Info (shown when still processing) -->
                <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                    <h3 style="color: #92400e; margin: 0 0 12px 0;">⏳ What Happens Next?</h3>
                    <ol style="text-align: left; color: #78350f; margin: 0; padding-left: 24px;">
                        <li style="margin-bottom: 8px;">Our professional engineers are processing your file</li>
                        <li style="margin-bottom: 8px;">You will receive another email when ready (20-60 min)</li>
                        <li style="margin-bottom: 8px;">Click the download link to get your modified file</li>
                        <li>Flash the file to your vehicle ECU</li>
                    </ol>
                </div>
                '''}
                
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
                <p style="margin: 0;">© 2024 ECU Flash Service | Professional ECU Tuning</p>
                <p style="margin: 8px 0 0 0;">For off-road and racing use only</p>
            </div>
            
        </div>
    </body>
    </html>
    """
    
    return html



# Admin email address for notifications
ADMIN_EMAIL = "admin@ecuflashservice.com"


async def send_admin_new_order_notification(
    order_id: str,
    customer_name: str,
    customer_email: str,
    order_details: dict
) -> bool:
    """
    Send notification email to admin when a new paid order comes in
    
    Args:
        order_id: Order ID
        customer_name: Customer's name
        customer_email: Customer's email
        order_details: Dict containing order info
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    
    # Extract details
    services = order_details.get('purchased_services', [])
    total_price = order_details.get('total_price', 0)
    vehicle_info = order_details.get('vehicle_info', {})
    
    # Build vehicle info string
    if isinstance(vehicle_info, dict) and vehicle_info:
        if vehicle_info.get('is_manual'):
            vehicle_str = f"{vehicle_info.get('manufacturer', 'N/A')} {vehicle_info.get('model', 'N/A')} {vehicle_info.get('generation', '')} {vehicle_info.get('engine', '')}"
        else:
            vehicle_str = f"{vehicle_info.get('manufacturer', 'N/A')} {vehicle_info.get('model', 'N/A')} {vehicle_info.get('generation', '')} - {vehicle_info.get('engine', '')}"
        ecu_type = vehicle_info.get('ecu', 'N/A')
    else:
        vehicle_str = "N/A"
        ecu_type = "N/A"
    
    # Build services list
    services_list = "\n".join([f"• {s.get('service_name', 'Service')} - ${s.get('price', 0):.2f}" for s in services])
    
    base_url = os.environ.get('BASE_URL', 'https://ecuflashservice.com')
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #1e293b; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔔 NEW PAID ORDER!</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
                <div style="background-color: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <h2 style="color: #f59e0b; margin: 0 0 15px 0; font-size: 18px;">Order #{order_id[:8]}</h2>
                    
                    <table style="width: 100%; color: #e2e8f0;">
                        <tr>
                            <td style="padding: 8px 0; color: #94a3b8;">Customer:</td>
                            <td style="padding: 8px 0; font-weight: bold;">{customer_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #94a3b8;">Email:</td>
                            <td style="padding: 8px 0;">{customer_email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #94a3b8;">Vehicle:</td>
                            <td style="padding: 8px 0; font-weight: bold;">{vehicle_str}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #94a3b8;">ECU Type:</td>
                            <td style="padding: 8px 0; color: #22d3ee; font-weight: bold;">{ecu_type}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #94a3b8;">Total:</td>
                            <td style="padding: 8px 0; color: #22c55e; font-weight: bold; font-size: 20px;">${total_price:.2f}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="color: #e2e8f0; margin: 0 0 15px 0;">Services Requested:</h3>
                    <pre style="color: #94a3b8; margin: 0; white-space: pre-wrap;">{services_list}</pre>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="{base_url}/admin" style="background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; display: inline-block;">
                        📋 Go to Admin Panel
                    </a>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px; border-top: 1px solid #334155;">
                <p style="margin: 0;">ECU Flash Service Admin Notification</p>
            </div>
            
        </div>
    </body>
    </html>
    """
    
    subject = f"🔔 NEW ORDER #{order_id[:8]} - ${total_price:.2f} - {customer_name}"
    
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set. Admin email would be sent to: %s", ADMIN_EMAIL)
        return False
    
    try:
        params = {
            "from": f"{SENDER_NAME} <{SENDER_EMAIL}>",
            "to": [ADMIN_EMAIL],
            "subject": subject,
            "html": html_content
        }
        
        email_response = await asyncio.to_thread(resend.Emails.send, params)
        email_id = email_response.get("id") if isinstance(email_response, dict) else getattr(email_response, 'id', None)
        
        if email_id:
            logger.info("Admin notification sent successfully for order %s (email_id: %s)", order_id, email_id)
            return True
        else:
            logger.error("Failed to send admin notification - no email ID returned")
            return False
            
    except Exception as e:
        logger.error("Error sending admin notification: %s", str(e))
        return False


async def send_file_ready_notification(
    customer_email: str,
    customer_name: str,
    order_id: str,
    download_url: str,
    order_details: dict
) -> bool:
    """
    Send email to customer when their processed file is ready for download
    
    Args:
        customer_email: Customer's email
        customer_name: Customer's name
        order_id: Order ID
        download_url: URL to download the processed file
        order_details: Dict containing order info
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    
    vehicle_info = order_details.get('vehicle_info', {})
    if isinstance(vehicle_info, dict) and vehicle_info:
        vehicle_str = f"{vehicle_info.get('manufacturer', '')} {vehicle_info.get('model', '')} {vehicle_info.get('engine', '')}"
    else:
        vehicle_str = "Your Vehicle"
    
    services = order_details.get('purchased_services', [])
    services_list = ", ".join([s.get('service_name', '') for s in services])
    
    base_url = os.environ.get('BASE_URL', 'https://ecuflashservice.com')
    full_download_url = f"{base_url}{download_url}" if not download_url.startswith('http') else download_url
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #1e293b; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✅ Your ECU File is Ready!</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
                <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6;">
                    Hi <strong>{customer_name}</strong>,
                </p>
                <p style="color: #94a3b8; font-size: 16px; line-height: 1.6;">
                    Great news! Your ECU tuning file has been professionally processed and is ready for download.
                </p>
                
                <div style="background-color: #1e293b; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; color: #e2e8f0;">
                        <tr>
                            <td style="padding: 8px 0; color: #94a3b8;">Order:</td>
                            <td style="padding: 8px 0; font-weight: bold;">#{order_id[:8]}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #94a3b8;">Vehicle:</td>
                            <td style="padding: 8px 0;">{vehicle_str}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #94a3b8;">Services:</td>
                            <td style="padding: 8px 0;">{services_list}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{full_download_url}" style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block;">
                        📥 Download Your File
                    </a>
                </div>
                
                <div style="background-color: #422006; border: 1px solid #854d0e; border-radius: 8px; padding: 15px; margin-top: 20px;">
                    <p style="color: #fbbf24; margin: 0; font-size: 14px;">
                        ⚠️ <strong>Important:</strong> This file is for off-road and competition use only. Please ensure proper installation by a qualified professional.
                    </p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px; border-top: 1px solid #334155;">
                <p style="margin: 0;">Thank you for choosing ECU Flash Service!</p>
                <p style="margin: 8px 0 0 0;">Need help? Reply to this email.</p>
            </div>
            
        </div>
    </body>
    </html>
    """
    
    subject = f"✅ Your ECU File is Ready - Order #{order_id[:8]}"
    
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set. File ready email would be sent to: %s", customer_email)
        return False
    
    try:
        params = {
            "from": f"{SENDER_NAME} <{SENDER_EMAIL}>",
            "to": [customer_email],
            "subject": subject,
            "html": html_content
        }
        
        email_response = await asyncio.to_thread(resend.Emails.send, params)
        email_id = email_response.get("id") if isinstance(email_response, dict) else getattr(email_response, 'id', None)
        
        if email_id:
            logger.info("File ready notification sent to %s for order %s (email_id: %s)", customer_email, order_id, email_id)
            return True
        else:
            logger.error("Failed to send file ready notification - no email ID returned")
            return False
            
    except Exception as e:
        logger.error("Error sending file ready notification: %s", str(e))
        return False

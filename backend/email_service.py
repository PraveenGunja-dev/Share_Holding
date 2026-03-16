import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

def send_report_email(to_address, report_date_display, pdf_bytes, pdf_filename) -> None:
    backend = os.environ.get("EMAIL_BACKEND", "smtp")
    
    subject = f"Adani Portfolio | Weekly Shareholding Report — {report_date_display}"
    
    body_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #00205B; color: white; padding: 24px; text-align: center;">
                <h1 style="margin: 0; font-size: 20px;">Adani Portfolio Analytics</h1>
            </div>
            <div style="padding: 24px; background-color: white;">
                <p>Hello,</p>
                <p>Please find attached the <b>Weekly Shareholding Movement Report</b> for the period ending <b>{report_date_display}</b>.</p>
                <div style="margin: 24px 0; padding: 16px; background-color: #f8fafc; border-left: 4px solid #00205B; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px;"><b>Report Summary:</b></p>
                    <ul style="font-size: 14px; margin-top: 8px;">
                        <li>Institutional holding trends</li>
                        <li>Top weekly buyers & sellers</li>
                        <li>FII & Mutual Fund house analytics</li>
                    </ul>
                </div>
                <p style="font-size: 13px; color: #64748b;">
                    <i>Note: The attached PDF is a read-only document and cannot be modified.</i>
                </p>
                <p>Regards,<br>Adani Group Analytics Team</p>
            </div>
            <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                &copy; 2026 Adani Group. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """

    if backend == "sendgrid":
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition
            import base64
            
            api_key = os.environ.get("SENDGRID_API_KEY")
            if not api_key:
                raise RuntimeError("SENDGRID_API_KEY mission")
                
            message = Mail(
                from_email=os.environ.get("EMAIL_FROM", "reports@adani.com"),
                to_emails=to_address,
                subject=subject,
                html_content=body_html
            )
            
            encoded_file = base64.b64encode(pdf_bytes).decode()
            attachedFile = Attachment(
                FileContent(encoded_file),
                FileName(pdf_filename),
                FileType('application/pdf'),
                Disposition('attachment')
            )
            message.attachment = attachedFile
            
            sg = SendGridAPIClient(api_key)
            sg.send(message)
            
        except ImportError:
            raise RuntimeError("sendgrid package not installed. Run 'pip install sendgrid'")
        except Exception as e:
            raise RuntimeError(f"SendGrid failed: {str(e)}")
            
    else: # SMTP
        host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
        port = int(os.environ.get("SMTP_PORT", 587))
        user = os.environ.get("SMTP_USER")
        password = os.environ.get("SMTP_PASSWORD")
        
        if not user or not password:
            raise RuntimeError("SMTP credentials (SMTP_USER/SMTP_PASSWORD) missing in .env")
            
        msg = MIMEMultipart()
        msg['From'] = os.environ.get("EMAIL_FROM", f"Reports <{user}>")
        msg['To'] = to_address
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body_html, 'html'))
        
        attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
        attachment.add_header('Content-Disposition', 'attachment', filename=pdf_filename)
        msg.attach(attachment)
        
        try:
            with smtplib.SMTP(host, port) as server:
                server.starttls()
                server.login(user, password)
                server.send_message(msg)
        except Exception as e:
            raise RuntimeError(f"SMTP failed: {str(e)}")

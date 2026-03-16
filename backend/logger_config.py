import logging
import sys
import os
from logging.handlers import RotatingFileHandler

# Directory for logs
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

LOG_FILE = os.path.join(LOG_DIR, "activity.log")

# Detailed format for security and analytics
# Highlights: Timestamp, Log Level, Name, IP, Action, Message
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"

def setup_logging():
    # Configure Root Logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Remove existing handlers if any
    if root_logger.hasHandlers():
        root_logger.handlers.clear()

    # 1. Console Handler (for real-time monitoring)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter(LOG_FORMAT))
    root_logger.addHandler(console_handler)

    # 2. Rotating File Handler (The "Black Box")
    # Max size 10MB, keep 5 old backups
    file_handler = RotatingFileHandler(
        LOG_FILE, 
        maxBytes=10*1024*1024, 
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
    root_logger.addHandler(file_handler)

    # Silence noisy web server logs to keep our logs clean
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.ERROR)

    logging.info("Logging system initialized. Analytics and security tracking active.")

# Create a logger for use in other modules
def get_logger(name):
    return logging.getLogger(name)

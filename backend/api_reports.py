from fastapi import APIRouter, HTTPException, Response, Query
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta

import base64
import sys

# Add PPT folder to the path so we can import from it
PPT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "PPT")
if PPT_DIR not in sys.path:
    sys.path.append(PPT_DIR)

# Import our logic modules
from logger_config import get_logger
from generate_ppt import generate_report
from pdf_converter import pptx_bytes_to_pdf, pptx_to_images
from email_service import send_report_email

logger = get_logger("REPORTS_API")

router = APIRouter()

# --- Paths (using the backend/PPT folder as requested) ---
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BACKEND_DIR)
PPT_DIR = os.path.join(BACKEND_DIR, "PPT")
ENV_PATH = os.path.join(PPT_DIR, ".env")

# --- SQLite DB Path ---
DB_PATH = os.path.join(ROOT_DIR, "WeeklyShareHolding_Update6.db")


def _update_env_bu_id(bu_id: int):
    """Auto-update the WSHP_BU_ID value in backend/.env whenever a report is
    generated for a specific BU. This keeps the .env in sync so that
    standalone runs also pick up the latest selection."""
    if not os.path.exists(ENV_PATH):
        logger.warning(f".env not found at {ENV_PATH}, skipping BU_ID update")
        return

    try:
        lines = Path(ENV_PATH).read_text(encoding="utf-8").splitlines()
        updated = False
        new_lines = []
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("WSHP_BU_ID="):
                new_lines.append(f"WSHP_BU_ID={bu_id}")
                updated = True
            else:
                new_lines.append(line)

        if not updated:
            new_lines.append(f"WSHP_BU_ID={bu_id}")

        Path(ENV_PATH).write_text("\n".join(new_lines) + "\n", encoding="utf-8")
        logger.info(f"ENV_UPDATED | WSHP_BU_ID set to {bu_id}")
    except Exception as e:
        logger.error(f"ENV_UPDATE_FAILED | {e}")


class EmailRequest(BaseModel):
    date: Optional[str] = None
    email: EmailStr


def _get_template_path() -> str:
    """Discover the PPT template from the PPT folder."""
    
    # 1. Prefer the default pristine template
    default_template = os.path.join(PPT_DIR, "Weekly Shareholder Movement_Template.pptx")
    if os.path.exists(default_template):
        logger.info(f"TEMPLATE_FOUND | Using Pristine Template: {default_template}")
        return default_template

    # 2. Last resort: check root dir
    fallback = os.path.join(ROOT_DIR, "Weekly_ShareHolding_Report_27-02 1.pptx")
    if os.path.exists(fallback):
        return fallback

    raise FileNotFoundError("No PPT template or Report file found in backend/PPT folder")


def _get_db_path() -> str:
    """Get the SQLite database path."""
    env_db = os.environ.get("DB_PATH")
    if env_db and os.path.exists(env_db) and os.path.getsize(env_db) > 0:
        return env_db

    # Check root folder first (where the real DB lives)
    if os.path.exists(DB_PATH) and os.path.getsize(DB_PATH) > 0:
        return DB_PATH

    # Try finding any non-empty .db file in the root directory only
    db_files = [f for f in os.listdir(ROOT_DIR) if f.lower().endswith('.db') and os.path.getsize(os.path.join(ROOT_DIR, f)) > 0]
    if db_files:
        return os.path.join(ROOT_DIR, sorted(db_files, reverse=True)[0])

    raise FileNotFoundError("SQLite database not found")


def get_report_metadata(date_iso: Optional[str], bu_id: int = 1):
    """Returns (pptx_bytes, display_date, bu_name, report_data)"""
    template_path = _get_template_path()
    db_path = _get_db_path()

    logger.info(f"REPORT_GENERATE | Template: {template_path} | DB: {db_path} | BU: {bu_id}")

    if not os.path.exists(template_path):
        raise HTTPException(status_code=500, detail="PPTX Template not found")
    if not os.path.exists(db_path):
        raise HTTPException(status_code=500, detail="Database file not found")

    # ---------- Auto-update WSHP_BU_ID in .env ----------
    _update_env_bu_id(bu_id)

    # ---------- Resolve the target date range from SQLite ----------
    target_date = date_iso
    db_conn = sqlite3.connect(db_path)
    cur = db_conn.cursor()

    date_range_label = None

    try:
        if not target_date or target_date == "latest":
            cur.execute(
                "SELECT DateRange FROM `Top 20 Holders` WHERE bu_id = ? ORDER BY rowid DESC LIMIT 1",
                (bu_id,),
            )
            res = cur.fetchone()
            if res:
                date_range_label = res[0]
        else:
            if " vs " in target_date:
                date_range_label = target_date
            else:
                try:
                    dt_str = datetime.strptime(target_date, "%Y-%m-%d").strftime("%d-%b-%y")
                    cur.execute(
                        "SELECT DateRange FROM `Top 20 Holders` WHERE bu_id = ? AND DateRange LIKE ? LIMIT 1",
                        (bu_id, f"%{dt_str}"),
                    )
                    res = cur.fetchone()
                    if res:
                        date_range_label = res[0]
                except Exception:
                    pass
    except Exception as e:
        logger.error(f"DATE_RESOLUTION_FAILED | {e}")
    finally:
        db_conn.close()

    # ---------- Fetch BU Name ----------
    bu_name = "Adani"
    try:
        db_conn = sqlite3.connect(db_path)
        cur = db_conn.cursor()
        cur.execute("SELECT bu_name FROM bu_details WHERE bu_id = ?", (bu_id,))
        res = cur.fetchone()
        if res:
            bu_name = res[0]
        db_conn.close()
    except Exception:
        pass

    # ---------- Generate Report ----------
    try:
        pptx_bytes, target_display_date, report_data = generate_report(template_path, db_path, date_range_label, bu_id)
        return pptx_bytes, target_display_date, bu_name, report_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.get("/preview-pdf")
async def preview_pdf(date: Optional[str] = None, bu_id: int = 1):
    pptx_bytes, display_date, bu_name, _ = get_report_metadata(date, bu_id)
    try:
        pdf_bytes = pptx_bytes_to_pdf(pptx_bytes)
        clean_bu = bu_name.replace(" ", "_")
        filename = f"Weekly_Report_{clean_bu}_{display_date.replace('-', '_')}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preview-slides")
async def preview_slides(date: Optional[str] = None, bu_id: int = 1):
    pptx_bytes, _, bu_name, report_data = get_report_metadata(date, bu_id)
    try:
        images_bytes = pptx_to_images(pptx_bytes)
        if not images_bytes:
            return {"slides": [], "data": report_data, "bu_name": bu_name}
        encoded = [base64.b64encode(img).decode('utf-8') for img in images_bytes]
        return {"slides": encoded, "bu_name": bu_name}
    except Exception as e:
        logger.error(f"SLIDE_PREVIEW_FAILED | {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download-pdf")
async def download_pdf(date: Optional[str] = None, bu_id: int = 1):
    pptx_bytes, display_date, bu_name, _ = get_report_metadata(date, bu_id)
    try:
        pdf_bytes = pptx_bytes_to_pdf(pptx_bytes)
        clean_bu = bu_name.replace(" ", "_")
        filename = f"Weekly_Report_{clean_bu}_{display_date.replace('-', '_')}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"PDF_DOWNLOAD_FAILED | Date: {date} | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download-pptx")
async def download_pptx(date: Optional[str] = None, bu_id: int = 1):
    pptx_bytes, display_date, bu_name, _ = get_report_metadata(date, bu_id)
    clean_bu = bu_name.replace(" ", "_")
    filename = f"Weekly_Report_{clean_bu}_{display_date.replace('-', '_')}.pptx"
    logger.info(f"PPTX_DOWNLOAD_SUCCESS | Date: {display_date}")
    return Response(
        content=pptx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/send-email")
async def send_email(req: EmailRequest, bu_id: int = 1):
    pptx_bytes, display_date, bu_name, _ = get_report_metadata(req.date, bu_id)
    try:
        pdf_bytes = pptx_bytes_to_pdf(pptx_bytes)
        clean_bu = bu_name.replace(" ", "_")
        filename = f"Weekly_Report_{clean_bu}_{display_date.replace('-', '_')}.pdf"
        logger.info(f"EMAIL_QUEUED | Recipient: {req.email} | Date: {display_date}")
        send_report_email(req.email, display_date, pdf_bytes, filename)
        logger.info(f"EMAIL_SENT_SUCCESS | Recipient: {req.email}")
        return {"success": True, "message": "Email sent successfully", "recipient": req.email}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/available-weeks")
async def available_weeks(bu_id: int = 1):
    """Return available date ranges for a specific BU from the SQLite DB."""
    db_path = _get_db_path()
    if not os.path.exists(db_path):
        return []

    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute(
            'SELECT DISTINCT "DateRange" FROM "Top 20 Holders" WHERE bu_id = ? ORDER BY rowid DESC',
            (bu_id,),
        )
        rows = [r[0] for r in cur.fetchall() if r[0]]
        conn.close()
        return rows
    except Exception as e:
        logger.error(f"AVAILABLE_WEEKS_FETCH_FAILED | {e}")
        return []

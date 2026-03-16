import os
import sqlite3
import time
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv

# Import logging and logic
from logger_config import setup_logging, get_logger
from api_reports import router as reports_router
import io

# Initialize Logging
setup_logging()
logger = get_logger("API_GATEWAY")

load_dotenv()

app = FastAPI(title="Adani Shareholding Analytics API")
app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])

# Security & Analytics Middleware
@app.middleware("http")
async def security_and_analytics_middleware(request: Request, call_next):
    client_ip = request.client.host
    method = request.method
    path = request.url.path
    user_agent = request.headers.get("user-agent", "Unknown Device")
    
    # 1. Start timer
    start_time = time.time()
    
    # 2. Track specific events (Downloads/Reports)
    if "/generate-pptx" in path or "/download-" in path:
        logger.info(f"DOWNLOAD_TRIGGERED | IP: {client_ip} | Resource: {path}")
    elif "/api/" in path:
        logger.info(f"API_ACCESS | IP: {client_ip} | Route: {path}")
    else:
        # General navigation
        logger.info(f"VISITOR_ACCESS | IP: {client_ip} | Path: {path} | User-Agent: {user_agent}")

    # 3. Process Request
    try:
        response: Response = await call_next(request)
    except Exception as e:
        logger.error(f"CRASH_DETECTED | IP: {client_ip} | Error: {str(e)}")
        raise e

    # 4. End timer and log performance
    process_time = (time.time() - start_time) * 1000
    
    # 5. Add Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root directory where .db files are stored
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT_DIR, "WeeklyShareHolding_Update5.db")

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def get_db_connection():
    if not os.path.exists(DB_PATH):
        logger.error(f"SYSTEM_ALERT | Database not found at: {DB_PATH}")
        return None
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = dict_factory
    return conn

# ─── NEW: Business Units endpoint ───────────────────────────────────
@app.get("/api/business-units")
@app.get("/shareholding-pattern/api/business-units")
async def get_business_units():
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cur = conn.cursor()
        cur.execute('SELECT bu_id, bu_name FROM bu_details ORDER BY bu_id')
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return rows
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/date-ranges")
@app.get("/shareholding-pattern/api/date-ranges")
async def get_date_ranges(bu_id: int):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cur = conn.cursor()
        # Union across all major tables to find all available weeks for this BU
        tables = [
            "Top 20 Holders", "Top 20 Buyers", "Top 20 Sellers", 
            "Entry", "Exit", "Top 20 Holders FII", 
            "Top 20 Active Holders MF", "Top 20 Holder Passive MF"
        ]
        union_query = " UNION ".join([f'SELECT DISTINCT "DateRange" FROM "{t}" WHERE bu_id = ?' for t in tables])
        params = tuple([bu_id] * len(tables))
        
        cur.execute(union_query, params)
        rows = [r["DateRange"] for r in cur.fetchall() if r["DateRange"]]
        cur.close()
        conn.close()
        return rows
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

# Endpoints mapping from flow description
# Map is: endpoint_path -> (table_name, order_by_col)
ENDPOINTS = {
    "holders/institutional": ("Top 20 Holders", "Rank"),
    "holders/buyers": ("Top 20 Buyers", "Sr.No"),
    "holders/sellers": ("Top 20 Sellers", "Sr.No"),
    "holders/fii": ("Top 20 Holders FII", "Rank"),
    "holders/mf-active": ("Top 20 Active Holders MF", "Rank"),
    "holders/mf-passive": ("Top 20 Holder Passive MF", "Rank"),
    "holders/insurance-pf": ("Top 20 Holders INS PF", "Rank"),
    "holders/aif": ("Top 20 Holders AIF", "Rank"),
    "holders/entries": ("Entry", None),
    "holders/exits": ("Exit", None),
}

# Dynamic function creator for endpoints — now filters by bu_id and optional date_range
def create_endpoint(table_name: str, order_by: Optional[str]):
    async def endpoint(
        bu_id: Optional[int] = None, 
        date_range: Optional[str] = None
    ):
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")
        try:
            cur = conn.cursor()
            
            # Simple list of conditions
            clauses = []
            vals = []
            
            if bu_id is not None:
                clauses.append("bu_id = ?")
                vals.append(bu_id)
            
            # If date_range is provided, we MUST use it to filter
            actual_dr = date_range
            if actual_dr and actual_dr.lower() != "latest" and actual_dr.strip() != "":
                clauses.append('"DateRange" = ?')
                vals.append(actual_dr)
            elif bu_id is not None:
                # No specific range, find latest for THIS BU
                try:
                    cur.execute(f'SELECT DISTINCT "DateRange" FROM "{table_name}" WHERE bu_id = ?', (bu_id,))
                    dr_list = [r["DateRange"] for r in cur.fetchall() if r["DateRange"]]
                    if dr_list:
                        latest_one = sorted(dr_list, reverse=True)[0]
                        clauses.append('"DateRange" = ?')
                        vals.append(latest_one)
                except:
                    pass

            sql = f'SELECT * FROM "{table_name}"'
            if clauses:
                sql += " WHERE " + " AND ".join(clauses)
            
            if order_by:
                sql += f' ORDER BY "{order_by}" ASC'
            
            cur.execute(sql, vals)
            data = [dict(r) for r in cur.fetchall()]
            cur.close()
            conn.close()
            return data
        except Exception as e:
            if conn: conn.close()
            raise HTTPException(status_code=500, detail=str(e))
    return endpoint

# Register endpoints (both with and without prefix as per flow)
for path, (table, order) in ENDPOINTS.items():
    fn = create_endpoint(table, order)
    # Register /api/holders/...
    app.get(f"/api/{path}")(fn)
    # Register /shareholding-pattern/api/holders/... (Nginx safety)
    app.get(f"/shareholding-pattern/api/{path}")(fn)

@app.get("/api/metadata")
@app.get("/shareholding-pattern/api/metadata")
async def get_metadata(bu_id: Optional[int] = None):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cur = conn.cursor()
        if bu_id is not None:
            cur.execute('SELECT * FROM "Top 20 Holders" WHERE bu_id = ? LIMIT 1', (bu_id,))
        else:
            cur.execute('SELECT * FROM "Top 20 Holders" LIMIT 1')
        row = cur.fetchone()
        cur.close()
        conn.close()
        return {"columns": list(row.keys()) if row else []}
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reports/generate-pptx")
@app.get("/shareholding-pattern/api/reports/generate-pptx")
async def get_report_pptx(date: Optional[str] = None, bu_id: int = 1):
    """Generate a PPTX report using the PPT folder template and SQLite DB."""
    import sys
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    ppt_dir = os.path.join(backend_dir, "PPT")
    if ppt_dir not in sys.path:
        sys.path.append(ppt_dir)
    
    from generate_ppt import generate_report as ppt_generate
    
    # Discover template from PPT folder 
    template_path = os.path.join(ppt_dir, "Weekly Shareholder Movement_Template.pptx")
    if not os.path.exists(template_path):
        # Fallback: any template .pptx in backend folder
        pptx_files = [f for f in os.listdir(backend_dir) if f.lower().endswith('.pptx') and 'template' in f.lower()]
        if pptx_files:
            template_path = os.path.join(backend_dir, pptx_files[0])

    try:
        pptx_bytes, display_date = ppt_generate(template_path, DB_PATH, date, bu_id)
        
        logger.info(f"REPORT_GENERATED | SUCCESS | BU: {bu_id} | Date: {display_date}")
        return StreamingResponse(
            io.BytesIO(pptx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={"Content-Disposition": f"attachment; filename=Weekly_Report_BU{bu_id}_{display_date}.pptx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/databases")
@app.get("/shareholding-pattern/api/databases")
def get_available_databases():
    return ["WeeklyShareHolding_Update5"]

# Serve static files from the build/dist directory if it exists
# In Vite this is 'dist', in Create React App this is 'build'
DIST_DIR = os.path.join(ROOT_DIR, "frontend", "dist")
if os.path.exists(DIST_DIR):
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

@app.get("/{path:path}")
async def catch_all(request: Request, path: str):
    # Try to serve as a file from dist
    file_path = os.path.join(DIST_DIR, path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # Otherwise return index.html for SPA routing
    index_path = os.path.join(DIST_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    
    return {"message": "Development API Server Live - Use /api endpoints"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("API_PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)

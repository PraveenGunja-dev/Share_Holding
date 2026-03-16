import sqlite3
import os
from datetime import datetime

def format_val(val, is_change=False):
    if val is None or val == "":
        return "-"
    try:
        fval = float(val)
        if is_change:
            if fval == 0: return "-"
            if fval < 0: return f"({abs(fval):.2f})"
            return f"{fval:.2f}"
        return f"{fval:.2f}"
    except:
        return str(val)

def format_date_display(iso_date):
    # iso_date: "2026-02-27" -> "27-Feb-26"
    dt = datetime.strptime(iso_date, "%Y-%m-%d")
    return dt.strftime("%d-%b-%y")

def get_rows(cur, table_name, curr_col, prev_col, mapping, limit=20):
    query = f'SELECT * FROM "{table_name}"'
    cur.execute(query)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    
    result = []
    for r in rows:
        d = dict(zip(cols, r))
        item = {}
        for target_key, source_key in mapping.items():
            # Handle dynamic date columns
            actual_source = source_key
            if source_key == "CURR": actual_source = curr_col
            elif source_key == "PREV": actual_source = prev_col
            
            val = d.get(actual_source)
            if target_key == "change" or target_key == "shares_moved":
                item[target_key] = format_val(val, is_change=True)
            elif "pct" in target_key or "curr_holding" in target_key or "prev_holding" in target_key:
                item[target_key] = format_val(val)
            else:
                item[target_key] = val if val is not None else ""
        result.append(item)
    
    return result[:limit]

def fetch_week_data(db_path: str, curr_iso: str, prev_iso: str) -> dict:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    # Convert ISO "2026-02-27" to DB format "02/27/2026"
    d_curr = datetime.strptime(curr_iso, "%Y-%m-%d").strftime("%m/%d/%Y")
    d_prev = datetime.strptime(prev_iso, "%Y-%m-%d").strftime("%m/%d/%Y")
    
    # Standard mappings
    std_map = {
        'rank': 'Rank',
        'shareholder_name': 'Institution',
        'category': 'Category',
        'curr_holding': 'CURR',
        'curr_pct': '% of Sh. Cap (Current)',
        'prev_holding': 'PREV',
        'prev_pct': '% of Sh. Cap (Previous)',
        'change': 'MoM change in holdings'
    }

    buy_map = {
        'rank': 'Sr.No',
        'shareholder_name': 'Name of Holder',
        'category': 'Category',
        'shares_moved': 'Buy Shares',
        'curr_holding': 'CURR',
        'curr_pct': '% of Sh. Cap (Current)',
        'prev_holding': 'PREV',
        'prev_pct': '% of Sh. Cap (Previous)'
    }

    sell_map = {
        'rank': 'Sr.No',
        'shareholder_name': 'Name of Holder',
        'category': 'Category',
        'shares_moved': 'Sold Shares',
        'curr_holding': 'CURR',
        'curr_pct': '% of Sh. Cap (Current)',
        'prev_holding': 'PREV',
        'prev_pct': '% of Sh. Cap (Previous)'
    }

    entry_map = {
        'category': 'Category',
        'shareholder_name': 'New Shareholder',
        'shares_moved': 'Shares Acquired during the Week',
        'pct_share_capital': '% of Share Capital'
    }

    exit_map = {
        'category': 'Category',
        'shareholder_name': 'Exited Shareholder',
        'shares_moved': 'Shares Sold during the Week',
        'pct_share_capital': '% of Share Capital'
    }

    data = {
        "current_date": format_date_display(curr_iso),
        "previous_date": format_date_display(prev_iso),
        "institutional_holders": get_rows(cur, "Top 20 Holders", d_curr, d_prev, std_map),
        "top_buyers": get_rows(cur, "Top 20 Buyers", d_curr, d_prev, buy_map),
        "top_sellers": get_rows(cur, "Top 20 Sellers", d_curr, d_prev, sell_map),
        "new_entries": get_rows(cur, "Entry", d_curr, d_prev, entry_map, limit=5),
        "exits": get_rows(cur, "Exit", d_curr, d_prev, exit_map, limit=5),
        "fii_fpi": get_rows(cur, "Top 20 Holders FII", d_curr, d_prev, std_map, limit=10),
        "mf_active": get_rows(cur, "Top 20 Active Holders MF", d_curr, d_prev, std_map, limit=10),
        "mf_passive": get_rows(cur, "Top 20 Holder Passive MF", d_curr, d_prev, {**std_map, 'shareholder_name': 'Name of Holder'}, limit=10),
        "insurance_pf": get_rows(cur, "Top 20 Holders INS PF", d_curr, d_prev, std_map, limit=10),
        "aif": get_rows(cur, "Top 20 Holders AIF", d_curr, d_prev, std_map, limit=10),
    }
    
    conn.close()
    return data

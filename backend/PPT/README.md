# PPT Generation (Weekly Shareholder Movement)

## What this folder contains

- `Weekly Shareholder Movement_Template.pptx`
- `.env.example`
- `requirements.txt`
- `README.md`

## Required file to add

Copy the following file from the main project root into this folder:

- `generate_ppt.py`

This script reads data from PostgreSQL tables and generates the PowerPoint.

## Setup

1. Create a virtual environment (recommended)
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create `.env` in this folder (copy from `.env.example`) and fill values:

- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`
- `WSHP_BU_ID`
- `WSHP_COMPANY_NAME`
- `WSHP_PPT_TEMPLATE` (default: `Weekly Shareholder Movement_Template.pptx`)
- `WSHP_PPT_OUTPUT`

## Run

From this `PPT` folder:

```bash
python generate_ppt.py
```

The output PPT will be created in the same folder as `generate_ppt.py`.

## Notes

- The script expects the required DB tables to already exist (e.g., `analysis`, `Top 20 Holders`, `Top 20 Buyers`, etc.) for the selected `WSHP_BU_ID`.
- If `WSHP_DATE1` and `WSHP_DATE2` are not provided, the script attempts to derive the latest two week columns from the `analysis` table.

# Adani Weekly Shareholding Dashboard (SQLite Edition)

A dynamic dashboard for tracking institutional and weekly shareholder movements in Adani Green Energy Limited (AGEL).

## 🚀 Features

- **SQLite Backend**: Lean, file-based database integration (`WeeklyShareHolding_Update4.db`).
- **Dynamic Endpoints**: API serving institutional holders, buyers, sellers, MF, AIF, and Insurance data.
- **Visual Analytics**: Interactive React-based charts and tables.
- **Unified Color Scheme**: Consistent category colors across the entire application.

---

## 🛠️ Setup & Installation

### 1. Backend (FastAPI + SQLite)
Navigate to the `backend` folder:
- **Environment**: Create a `.env` file (see `.env` for current config):
  ```env
  API_PORT=8002
  ```
- **Requirements**: Ensure dependencies are installed:
  ```bash
  pip install -r requirements.txt
  ```
- **Run**: 
  ```bash
  python main.py
  ```

### 2. Frontend (React + Vite)
Navigate to the `frontend` folder:
- **Install & Run**:
  ```bash
  npm install
  ```
- **Development**:
  ```bash
  npm run dev
  ```
- **Build**:
  ```bash
  npm run build
  ```

---

## 📂 Project Structure

- `/backend`: FastAPI server logic and endpoint definitions.
- `/frontend`: React source code, components, and styling.
- `WeeklyShareHolding_Update4.db`: The core SQLite database file.
- `start_dashboard.bat`: One-click script to start both servers.

## 🤝 Project Links
- **Figma Design**: [Link](https://www.figma.com/design/q5GLbmOd8lzjF4m0oPdnus/Shareholding-pattern-Agel)
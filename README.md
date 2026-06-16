# BigQuery Release Notes Tracker

A sleek, premium dark-themed web dashboard to track, search, filter, and share Google Cloud BigQuery release notes and updates. Built with a Python Flask backend and plain vanilla HTML, JavaScript, and CSS.

---

## 🚀 Features

* **Real-time Feed**: Fetches updates directly from the official Google Cloud BigQuery release notes RSS/Atom feed.
* **Smart Filter & Search**: Search by keywords or filter updates instantly by type (Features, Changes, Bug Fixes, Deprecations).
* **Live Refresh**: Fetch the latest updates at any time with a single click (featuring a loading spinner animation).
* **Detail Viewer**: Click any update card to read the full formatted release notes directly on the dashboard.
* **X / Twitter Share Integration**: Click to draft a tweet for any specific release note. Automatically truncates the title to stay within the 280-character limit while preserving documentation links and hashtags.

---

## 🛠️ Tech Stack

* **Backend**: Python, Flask, `feedparser`
* **Frontend**: HTML5, Vanilla CSS (Custom HSL Dark Mode & Glassmorphic accents), Vanilla JavaScript

---

## 📦 Directory Structure

```text
├── app.py                 # Flask server & XML parsing engine
├── requirements.txt       # Python dependency list
├── .gitignore             # Git ignored files & directories
├── templates/
│   └── index.html         # Main dashboard HTML template
└── static/
    ├── style.css          # Vanilla CSS layout & aesthetics stylesheet
    └── app.js             # Client-side filtering, state management & sharing logic
```

---

## 🏃 Run Locally

### 1. Clone the repository
```bash
git clone https://github.com/vikassr4705/agy-learn-event-talks-app.git
cd agy-learn-event-talks-app
```

### 2. Install dependencies
It is recommended to use a virtual environment:
```bash
python -m venv .venv
# On Windows
.venv\Scripts\activate
# On macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Start the application
```bash
python app.py
```

The application will start running on **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

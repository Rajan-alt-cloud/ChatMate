✨ Project Overview
ChatMate is a modern, real‑time 1‑on‑1 chat application featuring:

⚡ Instant messaging with optimistic UI rendering
⌨️ Live typing indicators
✅ Delivery & read acknowledgments (✔✔ / 🔵✔✔)
🔔 Audio alerts for new messages
📎 Media file sharing with previews
🌙 Dark‑themed responsive UI

🛠️ Tech Stack
 | Layer | Technology |
| --- | --- |
| **Backend** | FastAPI, Uvicorn, PostgreSQL, SQLAlchemy, Pydantic, JWT (``python-jose``), Passlib, WebSockets |
| **Frontend** | React 18+, Vite, TailwindCSS, Lucide React, Axios, Context API, Custom Hooks |
| **Utilities** | dotenv, Multipart uploads, Audio system |

📂 Repository Structure
ChatMate/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy models (User, Message)
│   │   ├── routes/          # API & WebSocket endpoints
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   ├── utils/           # WebSocket manager, security
│   │   ├── config.py        # Env settings
│   │   ├── database.py      # DB engine & session
│   │   └── main.py          # FastAPI entry point
│   ├── uploads/             # Media files
│   ├── requirements.txt
│   └── .env                 # Private env vars
│
├── frontend/
│   ├── public/              # Static audio & icons
│   ├── src/
│   │   ├── api/             # Axios client
│   │   ├── Components/      # UI components
│   │   ├── Context/         # Auth context
│   │   ├── hooks/           # WebSocket hooks
│   │   ├── utils/           # Audio helpers
│   │   ├── App.jsx          # Main container
│   │   └── main.jsx         # React DOM mount
│   ├── package.json
│   └── vite.config.js


⚙️ Installation & Setup
🔧 Backend (FastAPI)
cd backend
python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload

.env file requirements:
DATABASE_URL=postgresql://user:password@localhost:5432/chatmate
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

🎨 Frontend (React + Vite)
cd frontend
npm install
npm run dev

🔗 WebSocket Event Protocol
| Event | Description |
| --- | --- |
| ``chat`` | Real‑time text/media message dispatch |
| ``typing`` | Typing status broadcast |
| ``read_receipt`` | Blue tick read sync |
| ``delivery_ack`` | Double grey tick delivery confirmation |
| ``user_status`` | Online/offline presence |

👨‍🎨 Author
Rajan Prajapati  

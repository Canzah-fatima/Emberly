# Emberly

<div align="center">

  <h3>A refined, full-stack social experience built for connection and expression.</h3>

  <p>
    React · Node.js · Express · SQLite · WebSocket · Cloudinary
  </p>

</div>

---

## ✦ About Emberly

**Emberly** is a full-stack social web application designed around a polished, dark, high-contrast interface and a focused social experience.

Users can create and share photo, video, and text content, discover people and posts, interact through likes and comments, follow public or private accounts, share stories, and communicate through real-time private messaging.

The application is designed to feel responsive and natural across **desktop, tablet, and mobile** devices.

---

## ✨ Features

### 🔐 Authentication & Accounts

- Sign up and sign in with email or username
- JWT-based authentication
- Secure password hashing with bcrypt
- Password reset and password management
- Public and private profiles
- Profile editing and account settings

### 👥 Social Connections

- Follow and unfollow users
- Follow requests for private accounts
- Followers and following lists
- Follow-request notifications
- User discovery and search

### 📸 Posts & Media

- Photo and video posts
- Up to **10 media items per post**
- Ordered multi-media posts
- Touch/swipe media navigation
- Captions
- Hashtags
- @mentions
- Likes
- Saves
- Comments
- Comment replies
- Post sharing
- Full media viewer

### ◌ Stories

- Photo stories
- Video stories
- Text stories
- 24-hour expiration
- Story views
- Story navigation
- Responsive story viewer

### 💬 Real-Time Messaging

- One-to-one conversations
- Real-time WebSocket delivery
- Message read states
- Typing indicators
- Image attachments
- Video attachments
- Message pagination
- Responsive conversation layout

### 🔎 Discovery

- User search
- Recent searches
- Explore / discovery feed
- Hashtag-based discovery
- Saved posts
- Notifications
- Responsive media grids

### 📱 Responsive Experience

Designed from the beginning for:

- Mobile phones
- Tablets
- Laptops
- Desktop displays
- Large screens

The interface adapts navigation, spacing, dialogs, media, messaging and content layouts according to the available viewport.

---

## 🎨 Design Philosophy

Emberly uses a dark, high-contrast visual system with restrained accents and strong typography.

### Color System

| Role | Color |
| --- | --- |
| Foundation | `#181A2F` |
| Primary Surface | `#242E49` |
| Secondary Surface | `#37415C` |
| Warm Accent | `#FDA481` |
| Primary Accent | `#B4182D` |
| Deep Accent | `#54162B` |

The interface combines **Inter** for functional UI typography with **Fraunces** for expressive editorial moments.

The design emphasizes:

- Strong contrast
- Clear visual hierarchy
- Compact content cards
- Intentional spacing
- Responsive layouts
- Subtle motion
- Accessible interaction states
- Minimal visual clutter

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 |
| Build Tool | Vite |
| Routing | React Router |
| Styling | Tailwind CSS v4 |
| Backend | Node.js + Express |
| Database | SQLite + better-sqlite3 |
| Authentication | JWT + bcryptjs |
| Media Storage | Cloudinary |
| Upload Handling | Multer |
| Realtime | WebSocket |
| Animation | Framer Motion + GSAP |
| Icons | Lucide |
| Typography | Inter + Fraunces |

---

## 📂 Project Structure

```text
Emberly/
├── backend/
│   ├── lib/
│   ├── middleware/
│   ├── routes/
│   ├── db.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   └── pages/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have:

- **Node.js 18+**
- npm
- A Cloudinary account if you want to publish media

---

### 1. Clone the repository

```bash
git clone https://github.com/Canzah-fatima/Emberly.git
cd Emberly
```

---

### 2. Configure the backend

```bash
cd backend
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Then configure the required environment variables:

```env
PORT=5050
JWT_SECRET=use-a-long-random-secret
FRONTEND_ORIGIN=http://localhost:5173

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

> Never commit your `.env` file or real credentials to GitHub.

---

### 3. Start the backend

```bash
npm start
```

The API will run at:

```text
http://localhost:5050
```

The SQLite database is created automatically when the backend starts.

---

### 4. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The development frontend will be available at:

```text
http://localhost:5173
```

---

## 🗄️ Database

Emberly currently uses **SQLite with better-sqlite3**.

The database schema is initialized by the backend and includes data models for:

- Users
- Posts
- Post media
- Hashtags
- Mentions
- Likes
- Comments
- Comment likes
- Follows
- Saves
- Stories
- Story views
- Notifications
- Conversations
- Messages

The generated SQLite database is intentionally excluded from version control.

---

## ☁️ Media Storage

User-uploaded images and videos are handled through **Cloudinary**.

The backend uses Multer memory storage to process incoming uploads before sending them to Cloudinary.

No local `uploads/` directory is required for normal media storage.

---

## 🔒 Security & Environment Variables

Sensitive configuration belongs in `.env`.

The repository intentionally excludes:

```text
.env
.env.local
node_modules/
*.db
*.sqlite
docs/
```

A safe `.env.example` file is included so the required configuration can be understood without exposing credentials.

---

## 📱 Responsive Design

Emberly supports a minimum viewport width of approximately **320px** and progressively adapts to larger screens.

Responsive behavior covers:

- Collapsible desktop navigation
- Mobile bottom navigation
- Responsive post cards
- Mobile-friendly comments
- Touch media navigation
- Responsive profile grids
- Explore grids
- Full-screen media viewing
- Mobile messaging
- Safe-area-aware dialogs
- Responsive forms and controls

---

## 🧭 Application Experience

Emberly is organized around a simple social flow:

```text
Discover
   ↓
Connect
   ↓
Create
   ↓
Interact
   ↓
Message
   ↓
Share
```

The interface intentionally keeps secondary information out of the way while giving the primary content and interactions the most visual weight.

---

## 🧪 Production Build

To create a production frontend build:

```bash
cd frontend
npm run build
```

The generated build output is written to:

```text
frontend/dist/
```

Build artifacts are excluded from version control.

---

## 📌 Development Notes

Emberly keeps implementation details and development-only diagnostics outside normal user-facing experiences.

User-facing empty states, errors, loading states and confirmations are presented as part of the product UI rather than exposing internal implementation details.

---

## 📄 License

This project is currently intended as a personal / portfolio project.

If you plan to distribute or reuse the project publicly, add an appropriate license here.

---

<div align="center">

### Emberly

**Create. Connect. Discover.**

Built with React, Node.js and a little bit of fire.

</div>

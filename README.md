# Emberly

Emberly is a full-stack social media web application built with React, Node.js, Express and SQLite. It focuses on a polished dark social interface, reliable media handling, private messaging and responsive layouts.

## Features

- Authentication with email **or** username login
- JWT sessions and password management
- Public and private profiles
- Follow, follow-request, follower and following flows
- Photo/video posts with up to 10 media items
- Ordered multi-media carousel with touch navigation
- Captions, hashtags and @mentions
- Likes, saves, comments, replies and notifications
- 24-hour photo, video and text stories
- 1:1 messaging with authenticated WebSocket delivery
- Image/video message attachments
- Search, Explore and Saved views
- Unicode-backed emoji picker
- Responsive desktop, tablet and mobile UI

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS v4 |
| Backend | Node.js, Express |
| Database | SQLite with `better-sqlite3` |
| Authentication | JWT + bcryptjs |
| Media | Multer memory storage + Cloudinary |
| Realtime | WebSocket |
| UI | Inter + Fraunces, Framer Motion, GSAP, Lucide |

## Brand system

Emberly uses one canonical palette:

- **Foundation:** `#181A2F`
- **Primary surface:** `#242E49`
- **Secondary surface:** `#37415C`
- **Warm accent:** `#FDA481`
- **Primary accent:** `#B4182D`
- **Deep accent:** `#54162B`

The interface is intentionally dark, high-contrast and restrained. The desktop sidebar can be collapsed or expanded and the mobile layout uses a bottom navigation bar.

## Project structure

```text
emberly/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── middleware/
│   └── routes/
└── frontend/
    ├── index.html
    ├── public/
    └── src/
        ├── api/
        ├── components/
        ├── context/
        └── pages/
```


## Local development

Node.js 18+ is recommended.

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm start
```

The API runs on `http://localhost:5050`. SQLite creates `backend/emberly.db` automatically.

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The development frontend runs on `http://localhost:5173`.

### Production build

```bash
cd frontend
npm run build
```

## Media setup

Copy `backend/.env.example` to `backend/.env` and configure Cloudinary before publishing user media:

```env
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
JWT_SECRET=use-a-long-random-secret
FRONTEND_ORIGIN=http://localhost:5173
```

Media is kept in memory during the upload request and sent directly to Cloudinary. The backend does not expose a local uploads directory.

## Product notes

The application avoids exposing developer notes, provider diagnostics or implementation explanations in normal user-facing screens. Empty states and errors are written as product UI, while technical details stay in the development environment.

## Responsive behavior

The UI is designed around a minimum supported width of 320px and progressively adapts through phone, tablet and desktop breakpoints. Dialogs respect viewport height and safe-area insets, long content wraps safely, and primary controls remain reachable on touch devices.

## GitHub

Before publishing, review `.gitignore`, add the project to a clean repository, and keep `.env` and the generated SQLite database out of version control.

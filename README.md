# GRIT Interview Scheduling

A prototype for GRIT Level Clearance Interview scheduling. It includes student booking, interviewer availability and outcomes, Interview Ops tracking, in-app messages, and a before/after gallery.

## Run locally

Requirements: Node.js and npm.

```powershell
npm install
Copy-Item .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose a demo persona. The seed data is fictional. Authentication and message delivery are simulated for this prototype.

## Documentation

- [Project write-up](docs/writeup.md)
- [Loom walkthrough script](docs/loom-script.md)

The write-up is also available in the app at `/writeup`, with Markdown and PDF downloads.

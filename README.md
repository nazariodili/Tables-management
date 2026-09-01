# Event Seating Planner

**▶ Live app: https://tables-management-events.vercel.app/**

A web app to plan and manage guest seating for events (weddings, dinners,
conferences…). Drag guests onto seats, create rectangular or round tables,
draw zones, and manage multiple layout scenarios across pages.

**100% in the browser**: no account, no server. Data is saved in each user's
browser (localStorage) and survives page refreshes and browser restarts.

## Features

- **Rectangular** and **round** tables, with adjustable seat counts
- **Drag & drop** guests: assign, move, swap, reorder, remove
- Guest list with **search**, **tags** and customizable **colors**
- Multiple **pages / scenarios** (layout drafts), duplicable
- Draw **zones** on the canvas with a name and color
- Canvas with **zoom/pan**, resizable Figma-style sidebars
- Automatic local saving

## Run locally

```bash
npm install
npm run dev
```

Open the printed URL (default http://localhost:5173).

## Production build

```bash
npm run build
```

Outputs static files to `dist/`, deployable to any static host
(Vercel, Netlify, Cloudflare Pages, GitHub Pages…).

## Stack

React 18 · Vite · TypeScript · Tailwind CSS · react-dnd · lucide-react

## Data & privacy

All data (guests, tables, assignments) is stored **only in the user's browser**
via `localStorage`. Nothing is sent to any server.

## License

[MIT](LICENSE)

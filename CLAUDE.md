# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Environment

Node.js v24.14.0 is installed as a standalone zip directly in `C:\statki` — it is **not** on the system PATH. All node/npm commands must use the local binaries.

## Commands

**Start dev server:**
```
.\node.exe .\node_modules\vite\bin\vite.js
```

**Build:**
```
.\node.exe .\node_modules\typescript\bin\tsc -b
.\node.exe .\node_modules\vite\bin\vite.js build
```

**Install packages:**
```
.\npm.cmd install --ignore-scripts
```
> After `npm install`, the `node_modules\npm` directory gets removed (npm removes itself). Restore it by copying from `C:\Users\PawełŚniegoń\AppData\Local\Temp\node-temp\node-v24.14.0-win-x64\node_modules\npm` back into `node_modules\`.

## Conventions

- Components go in `src/components/`
- Game state goes in `src/store/`
- Variable and file names in English, comments in Polish
- Do not install new UI libraries without asking first

## Architecture

Early-stage project — only the scaffold exists so far.

- `src/App.tsx` — root component, entry point for all UI
- `src/main.tsx` — mounts React app into `#root`
- `src/index.css` — single CSS file, contains only `@import "tailwindcss"` (Tailwind v4 CSS-first setup — no `tailwind.config.js`)

## Tech Stack

- **Vite 6** + **React 19** + **TypeScript 5.7**
- **Tailwind CSS v4** — configured via `@tailwindcss/vite` plugin in `vite.config.ts`; no config file
- **Supabase JS v2** — installed, not yet used

# walter.dev

Personal portfolio and blog built with Astro. Focused on clean architecture, solid fundamentals, and software that lasts.

## Pages

| Route | Description |
| :---- | :---------- |
| `/` | Landing page — Hero, Projects grid, Tech Stack, Explore section |
| `/blog` | Blog listing with client-side tag filtering |
| `/blog/[slug]` | Individual post with Tailwind Typography prose layout |
| `/terminal` | Interactive CLI — browse the portfolio from a terminal emulator |
| `/dashboard` | Grafana-style metrics dashboard (KPIs, charts, status panels) |
| `/about` | About page |

## Stack

- **Astro 5** — static site generator with island architecture
- **React 19** — used for interactive islands (`Terminal.tsx`)
- **Tailwind CSS v4** — via `@tailwindcss/vite` (no config file needed)
- **TypeScript** — strict throughout
- **Framer Motion** — animations
- **MDX** — rich content for blog posts

## Project Structure

```
src/
├── components/
│   ├── BaseHead.astro       # Head meta + ClientRouter (View Transitions)
│   ├── Header.astro         # Sticky nav with all routes
│   ├── Terminal.tsx         # React island — interactive CLI
│   └── ...
├── content/
│   └── blog/                # Markdown & MDX posts
├── data/
│   └── projects.ts          # Central project data (landing + terminal)
├── layouts/
│   └── BlogPost.astro       # Post layout with prose-invert typography
├── pages/
│   ├── index.astro          # Landing page
│   ├── terminal.astro       # Full-screen terminal wrapper
│   ├── dashboard.astro      # Grafana-style dashboard
│   └── blog/
│       ├── index.astro      # Blog listing + tag filter
│       └── [...slug].astro  # Post page
└── styles/
    └── global.css           # Tailwind v4 entry point + typography plugin
```

## Commands

| Command | Action |
| :------ | :----- |
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server at `localhost:4321` |
| `npm run build` | Build for production to `./dist/` |
| `npm run preview` | Preview production build locally |
| `npm run astro check` | Type-check the project |

## Terminal Commands

The `/terminal` page runs an interactive CLI. Available commands:

```
help        Show available commands
projects    List all projects
open <n>    Open a project by number
contact     Show contact info
portfolio   Go to the portfolio landing
clear       Clear the terminal
```

## Notes

- Tailwind v4 integrates as a Vite plugin — no `tailwind.config.mjs` file
- Plugins declared in CSS: `@plugin "@tailwindcss/typography"` in `global.css`
- React components imported in `.astro` files must use `client:*` directives for interactivity
- View Transitions use `ClientRouter` from `astro:transitions` (not the deprecated `ViewTransitions`)

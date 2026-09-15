# jacek4yang.github.io

Interactive systems portfolio for [jacek4yang](https://github.com/jacek4yang).

Hand-rolled TypeScript + Vite + raw WebGL — no framework, no runtime
dependencies, single JS chunk under ~30 kB gzipped.

## Development

```sh
npm install
npm run dev        # local dev server
npm run build      # type-check (tsc --noEmit) + production build
npm run preview    # serve the production build locally
```

## Structure

```
index.html            single page
src/gl/field.ts       WebGL network-topology background (adaptive, reduced-motion aware)
src/ui/boot.ts        non-blocking boot sequence
src/ui/cards.ts       project cards from verified data
src/ui/sysmap.ts      SYSTEM MAP — SVG repository graph
src/ui/terminal.ts    jterm navigation terminal
src/data/projects.ts  project facts (verified against live repos)
src/style/main.css    design tokens + all styling
```

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys `main`
to Pages. The Pages source must be set to **GitHub Actions**.

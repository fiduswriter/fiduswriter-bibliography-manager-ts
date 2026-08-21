<p align="center">
  <img src="https://git.fiduswriter.org/fiduswriter/fiduswriter-bibliography-manager-ts/raw/branch/main/logo.svg" alt="@fiduswriter/bibliography-manager" width="100" height="100">
</p>

<h1 align="center">@fiduswriter/bibliography-manager</h1>

<p align="center">Bibliography manager UI and logic for Fidus Writer</p>

---

## What it does

Implements the browser-based bibliography management interface used in the
Fidus Writer collaborative editor. Provides an overview table for browsing
citations, an entry form with specialized field editors, a client-side
database connector, and import/export filters for bibliography data.

## Demo

A live, standalone demo of the overview table and entry editor is published via
git-pages at:

<https://fiduswriter.pages.fiduswriter.org/fiduswriter-bibliography-manager-ts/>

To run it locally:

```bash
npm run build:demo
npm run demo   # serves demo/ at http://localhost:8081
```

## Exports

| Export | Description |
|--------|-------------|
| `BibliographyOverview` | Full overview table component showing all bibliography entries |
| `BibEntryForm` | Entry form with per-field-type editors (names, dates, ranges, URIs, literals, etc.) |
| `BibliographyDB` | Client-side connector to the server's bibliography database |
| `importBibFile` | Import bibliography data from external files (BibTeX, CSL JSON, etc.) |
| `exportBibFile` | Export bibliography data to external formats |

## Installation

```bash
npm install @fiduswriter/bibliography-manager
```

## Usage

```ts
import {
    BibliographyOverview,
    BibEntryForm,
    BibliographyDB,
    importBibFile,
    exportBibFile
} from "@fiduswriter/bibliography-manager"
```

The bibliography manager depends on `@fiduswriter/common` for page chrome and
`fwtoolkit` for UI primitives.

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript to dist/
npm run typecheck    # Check types without emitting
npm run lint         # Lint with ESLint
npm run format:check # Check formatting with Prettier
```

## License

AGPL-3.0 — see [LICENSE](LICENSE) for details.

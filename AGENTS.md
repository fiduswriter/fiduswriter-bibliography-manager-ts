# AGENTS.md — @fiduswriter/bibliography-manager

## Project overview

`@fiduswriter/bibliography-manager` is a JavaScript/TypeScript library that
implements the Fidus Writer bibliography manager: the overview table, the entry
form and field editors, import/export filters, and the bibliography database
connector.

- Package name: `@fiduswriter/bibliography-manager`
- License: `AGPL-3.0`
- Repository: `https://git.fiduswriter.org/fiduswriter/fiduswriter-bibliography-manager-ts.git`
- Author: Johannes Wilm

## Scope

Code in this repository should be limited to:

- Bibliography overview (`src/overview/`).
- Bibliography entry form and field editors (`src/form/`, `src/form/fields/`).
- Bibliography database client connector (`src/database/`).
- Bibliography import filters (`src/import/`).
- Bibliography export filters (`src/export/`).
- Shared bibliography tools (`src/tools.js`).

The ProseMirror schema specs previously in `src/schema/` have moved to the
`bibliojson` package (`src/spec/`). This package now instantiates the schemas it
needs (literal, title, long-literal) from those specs.

Do **not** put in this repository:

- Generic UI primitives (those belong in `fwtoolkit`).
- Fidus-Writer-specific shared chrome (use `@fiduswriter/common`).
- Document-level import/export logic (use `@fiduswriter/document`).

## Candidates for `fwtoolkit`

The following UI patterns are currently here but may be generic enough for
`fwtoolkit` after evaluation:

- The bibliography form field widgets in `src/form/fields/`.
- The import/export dialog patterns.

## Technology stack

- **Language:** TypeScript 6.0+ (currently still mostly JavaScript).
- **Module system:** ESM (`"type": "module"`).
- **Build tool:** `tsc` only; no bundler is used.

## Directory layout

```
.
├── src/                  # Source files
│   ├── index.js          # Public barrel export
│   ├── database/         # Client-side bibliography database connector
│   ├── export/           # Export filters
│   ├── form/             # Entry form and field editors
│   ├── import/           # Import filters
│   ├── overview/         # Overview table
│   └── tools.js          # Shared utilities
├── dist/                 # Compiled JS, .d.ts and source maps (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Build commands

```bash
npm install
npm run build
npm run typecheck
```

## Consumers

- `fiduswriter/` (the main Fidus Writer Django app).

## Notes

- This package depends on `@fiduswriter/common` for shared page chrome
  (`baseBodyTemplate`, `FeedbackTab`, `SiteMenu`).
- The `bibliojson` dependency is used heavily. It was previously published as
  `biblatex-csl-converter`. Its JSON format is referred to as the BiblioJSON
  format.

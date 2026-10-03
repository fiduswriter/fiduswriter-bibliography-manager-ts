import {BibLatexExporter, CSLExporter} from "bibliojson"
import {Dialog} from "fwtoolkit"
import type {DialogButtonSpec} from "fwtoolkit/dialog"
import type {BibDBCollection, BibDBEntry} from "../types/biblio.js"

/** Formats that bibliojson can export a bibliography to. */
export type BibExportFormat = "bibliojson" | "biblatex" | "csl_json"

interface BibExportFormatInfo {
    id: BibExportFormat
    label: string
    filename: string
    mimeType: string
}

export const BIB_EXPORT_FORMATS: BibExportFormatInfo[] = [
    {
        id: "bibliojson",
        label: gettext("BiblioJSON"),
        filename: "bibliography.json",
        mimeType: "application/json"
    },
    {
        id: "biblatex",
        label: gettext("BibLaTeX"),
        filename: "bibliography.bib",
        mimeType: "application/x-bibtex"
    },
    {
        id: "csl_json",
        label: gettext("CSL JSON"),
        filename: "bibliography-csl.json",
        mimeType: "application/json"
    }
]

function exportFormatInfo(format: BibExportFormat): BibExportFormatInfo {
    return (
        BIB_EXPORT_FORMATS.find(info => info.id === format) ||
        BIB_EXPORT_FORMATS[1]
    )
}

/** Save the given text content.
 *
 * Routes through `@fiduswriter/document`'s `saveFile()`, which prefers
 * `window.showSaveFilePicker` when a host provides it. That is what lets the
 * desktop app put a native Save dialog here instead of triggering a browser
 * download. Hosts without a picker fall back to a normal download.
 */
async function saveContents(
    contents: string,
    filename: string,
    mimeType: string
): Promise<void> {
    const {saveFile} = await import("@fiduswriter/document/exporter/save")
    await saveFile(new Blob([contents], {type: mimeType}), filename, {
        description: "Bibliography",
        mimeType,
        extensions: [filename.slice(filename.lastIndexOf("."))]
    })
}

/** Convert the client-side db (keyed by server id) to the string-keyed db the
 * bibliojson exporters expect. */
function toExporterDB(db: Record<number, BibDBEntry>): Record<string, BibDBEntry> {
    const out: Record<string, BibDBEntry> = {}
    Object.entries(db).forEach(([id, entry]) => {
        out[String(id)] = entry
    })
    return out
}

/** Strip the client-only fields so an entry serialises to a clean BiblioJSON
 * `EntryObject`. */
function toBiblioJSONEntry(entry: BibDBEntry): Record<string, unknown> {
    const {cats: _cats, id: _id, ...rest} = entry
    return rest as Record<string, unknown>
}

function selectedEntries(
    db: Record<number, BibDBEntry>,
    pks: number[]
): Record<string, BibDBEntry> {
    const out: Record<string, BibDBEntry> = {}
    pks.forEach(pk => {
        if (db[pk]) {
            out[String(pk)] = db[pk]
        }
    })
    return out
}

/** Serialise the selected entries to the requested format. */
export function serializeBibDB(
    db: Record<number, BibDBEntry>,
    pks: number[],
    format: BibExportFormat
): string {
    const exporterDB = toExporterDB(db)
    const pkStrings = pks.map(String)
    switch (format) {
        case "bibliojson": {
            const clean: Record<string, unknown> = {}
            Object.entries(selectedEntries(db, pks)).forEach(([id, entry]) => {
                clean[id] = toBiblioJSONEntry(entry)
            })
            return JSON.stringify(clean, null, 2)
        }
        case "csl_json": {
            const exporter = new CSLExporter(exporterDB, pkStrings)
            return JSON.stringify(exporter.parse(), null, 2)
        }
        case "biblatex":
        default: {
            const exporter = new BibLatexExporter(exporterDB, pkStrings)
            return exporter.parse()
        }
    }
}

/** Export the selected bibliography entries to the given format and save them.
 *
 * Returns a promise that resolves once the file has been handed to the host's
 * save mechanism, so callers can await a native dialog.
 *
 * The promise never rejects: every in-tree caller invokes this as a statement
 * (the dialog button handler and the legacy `BibLatexFileExporter`), so a
 * rejection would surface as an unhandled rejection with no way for the host to
 * react. Failures are logged instead. Callers that want to react can inspect
 * the boolean `saveContents` yields through the File System Access API shim.
 */
export function exportBibFile(
    bibDB: BibDBCollection,
    pks: number[],
    format: BibExportFormat = "biblatex"
): Promise<void> {
    const info = exportFormatInfo(format)
    const contents = serializeBibDB(bibDB.db, pks, format)
    return saveContents(contents, info.filename, info.mimeType).catch((error) => {
        console.error(`Could not export the bibliography to ${info.filename}:`, error)
    })
}

/** Open a dialog letting the user choose an export format for the selected
 * bibliography entries. */
export function exportBibFileDialog(bibDB: BibDBCollection, pks: number[]): void {
    const options = BIB_EXPORT_FORMATS.map(info => {
        const checked = info.id === "bibliojson" ? "checked" : ""
        return `<label class="fw-checkable-label">
            <input type="radio" name="bib-export-format" value="${info.id}" ${checked} />
            <span>${info.label}</span>
        </label>`
    }).join("")

    const buttons: DialogButtonSpec[] = [
        {
            text: gettext("Export"),
            classes: "fw-dark",
            click: () => {
                const selected = document.querySelector<HTMLInputElement>(
                    'input[name="bib-export-format"]:checked'
                )
                const format = (selected?.value || "bibliojson") as BibExportFormat
                exportBibFile(bibDB, pks, format)
                dialog.close()
            }
        },
        {
            type: "cancel"
        }
    ]

    const dialog = new Dialog({
        id: "export-bibliography",
        title: gettext("Export bibliography"),
        body: `<div class="fw-radio-list">${options}</div>`,
        buttons
    })
    dialog.open()
}

/**
 * Legacy single-format exporter. Kept for backward compatibility; use
 * `exportBibFile` with an explicit format for multi-format export.
 */
export class BibLatexFileExporter {
    pks: number[]
    bibDB: BibDBCollection

    constructor(bibDB: BibDBCollection, pks: number[]) {
        this.pks = pks
        this.bibDB = bibDB
    }

    init(): void {
        exportBibFile(this.bibDB, this.pks, "biblatex")
    }
}

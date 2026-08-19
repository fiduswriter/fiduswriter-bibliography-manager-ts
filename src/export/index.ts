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

/** Trigger a browser download for the given text content. */
function triggerDownload(contents: string, filename: string, mimeType: string): void {
    const blob = new Blob([contents], {type: mimeType})
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 0)
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

/** Export the selected bibliography entries to the given format and trigger a
 * browser download. */
export function exportBibFile(
    bibDB: BibDBCollection,
    pks: number[],
    format: BibExportFormat = "biblatex"
): void {
    const info = exportFormatInfo(format)
    const contents = serializeBibDB(bibDB.db, pks, format)
    triggerDownload(contents, info.filename, info.mimeType)
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

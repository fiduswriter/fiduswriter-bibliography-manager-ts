import {
    Dialog,
    activateWait,
    addAlert,
    deactivateWait
} from "fwtoolkit"
import type {DialogButtonSpec} from "fwtoolkit/dialog"
import {importBibFileTemplate} from "./templates.js"
import type {BibliographyApp, BibDBCollection} from "../types/biblio.js"

/** First step of the bibliography file import. Creates a dialog box to specify upload file.
 * Supports multiple formats: BibTeX/BibLaTeX, CSL-JSON, RIS, EndNote, Citavi, NBIB, ODT/DOCX citations.
 */

export class BibliographyFileImportDialog {
    bibDB: BibDBCollection
    addToListCall: (ids: number[]) => void
    tmpDB: boolean
    app: BibliographyApp

    /** File chosen via a host-provided picker, when one is available. */
    private pickedFile: File | null = null

    constructor(
        bibDB: BibDBCollection,
        addToListCall: (ids: number[]) => void,
        app: BibliographyApp
    ) {
        this.bibDB = bibDB
        this.addToListCall = addToListCall
        this.tmpDB = false
        this.app = app
    }

    /**
     * Resolve the file to import.
     *
     * Prefers a host-provided picker (the desktop app opens a native OS
     * dialog) and falls back to the `<input type="file">` in the dialog body.
     * Returns `null` when nothing is selected.
     */
    private async resolveFile(): Promise<File | null> {
        if (this.app.filePicker) {
            this.pickedFile =
                (await this.app.filePicker({
                    extensions: [
                        "bib",
                        "json",
                        "ris",
                        "enw",
                        "nbib",
                        "xml",
                        "odt",
                        "docx"
                    ]
                })) ?? null
            return this.pickedFile
        }
        const input = document.getElementById("bib-uploader") as HTMLInputElement | null
        return input?.files?.[0] ?? null
    }

    /** Largest accepted bibliography file (10 MB), as before. */
    private static readonly MAX_FILE_SIZE = 10485760

    /** The dialog instance, so the async import path can close it. */
    private dialog: Dialog | null = null

    /** Read the selected file and hand its text to the importer. */
    private async runImport(): Promise<void> {
        const bibFile = await this.resolveFile()
        if (!bibFile) {
            return
        }
        if (BibliographyFileImportDialog.MAX_FILE_SIZE < bibFile.size) {
            return
        }
        if (this.app.isOffline()) {
            addAlert(
                "info",
                gettext(
                    "You are currently offline. Please try again when you are back online."
                )
            )
            this.dialog?.close()
            return
        }
        activateWait()
        try {
            const text = await bibFile.text()
            const {BibliographyImporter} = await import(
                "./bibliography_import.js"
            )
            const importer = new BibliographyImporter(
                text,
                this.bibDB,
                this.addToListCall,
                () => deactivateWait()
            )
            importer.init()
        } catch (error) {
            deactivateWait()
            addAlert(
                "error",
                gettext("Could not read the bibliography file.")
            )
            console.error("Bibliography import failed:", error)
        }
        this.dialog?.close()
    }

    init(): void {
        if (this.app.isOffline()) {
            addAlert(
                "info",
                gettext(
                    "You are currently offline. Please try again when you are back online."
                )
            )
            return
        }
        const buttons: DialogButtonSpec[] = [
            {
                text: gettext("Import"),
                classes: "fw-dark submit-import",
                click: () => {
                    // `resolveFile` is async when a host picker is used, but
                    // the dialog contract expects a synchronous return value,
                    // so the import is driven from the promise chain.
                    void this.runImport()
                    return false
                }
            },
            {
                type: "cancel"
            }
        ]
        const dialog = new Dialog({
            id: "importbibtex",
            title: gettext("Import a bibliography"),
            body: importBibFileTemplate(),
            height: 200,
            buttons
        })
        this.dialog = dialog
        dialog.open()
        const uploader = document.getElementById("bib-uploader")
        if (uploader) {
            uploader.addEventListener("change", () => {
                const input = uploader as HTMLInputElement
                const label = document.getElementById("import-bib-name")
                if (label) {
                    label.innerHTML = input.value.replace(/C:\\fakepath\\/i, "")
                }
            })
        }
        const importBtn = document.getElementById("import-bib-btn")
        if (importBtn) {
            importBtn.addEventListener("click", () => {
                // With a host picker the selection is made through the OS
                // dialog, so import immediately instead of clicking the
                // (hidden) file input.
                if (this.app.filePicker) {
                    void this.runImport()
                    return
                }
                const input = document.getElementById("bib-uploader")
                if (input) {
                    input.click()
                }
            })
        }
    }
}

import {addAlert} from "fwtoolkit"
import type {BibDBCollection, BibDBEntry, IdTranslation} from "../types/biblio.js"
import {detectImportFormat} from "./format.js"

interface ImportMessage {
    type: string
    errorCode?: string
    errorType?: string
    key?: string
    type_name?: string
    field_name?: string
    entry?: string
    data?: Record<number, BibDBEntry>
    done?: boolean
}

const ERROR_MSG: Record<string, string> = {
    no_entries: gettext(
        "No bibliography entries could be found in import file."
    ),
    entry_error: gettext("An error occured while reading a bibliography entry"),
    unknown_field: gettext(
        "Field cannot not be saved. Fidus Writer does not support the field."
    ),
    unknown_type: gettext(
        'Entry has been saved as "misc". Fidus Writer does not support the entry type.'
    ),
    unknown_date: gettext("Field does not contain a valid EDTF string."),
    server_save: gettext("The bibliography could not be updated"),
    unsupported_format: gettext("The file format could not be recognized.")
}

export class BibliographyImporter {
    fileContents: string
    bibDB: BibDBCollection
    addToListCall: (ids: number[]) => void
    callback: (() => void) | false | undefined
    showAlerts: boolean

    constructor(
        fileContents: string,
        bibDB: BibDBCollection,
        addToListCall: (ids: number[]) => void,
        callback: (() => void) | false | undefined,
        showAlerts = true,
    ) {
        this.fileContents = fileContents
        this.bibDB = bibDB
        this.addToListCall = addToListCall
        this.callback = callback
        this.showAlerts = showAlerts
    }

    init(): void {
        // Detect the format of the input file
        const format = detectImportFormat(this.fileContents)

        if (!format) {
            if (this.showAlerts) {
                addAlert("error", ERROR_MSG.unsupported_format)
            }
            if (this.callback) {
                this.callback()
            }
            return
        }

        // Use the worker for the detected format
        const importWorker = new Worker(new URL("./workers/bibliography_import_worker.js", import.meta.url))
        importWorker.onmessage = message => this.onMessage(message.data as ImportMessage)
        importWorker.postMessage({
            fileContents: this.fileContents,
            format: format
        })
    }

    onMessage(message: ImportMessage): void {
        let errorMsg: string | undefined
        let data: Record<number, BibDBEntry> | undefined
        switch (message.type) {
            case "error":
            case "warning":
                errorMsg = ERROR_MSG[message.errorCode || ""]
                if (!errorMsg) {
                    errorMsg = gettext(
                        "There was an issue with the bibliography import"
                    )
                }
                if (message.errorType) {
                    errorMsg += `, error_type: ${message.errorType}`
                }
                if (message.key) {
                    errorMsg += `, key: ${message.key}`
                }
                if (message.type_name) {
                    errorMsg += `, entry: ${message.type_name}`
                }
                if (message.field_name) {
                    errorMsg += `, field_name: ${message.field_name}`
                }
                if (message.entry) {
                    errorMsg += `, entry: ${message.entry}`
                }
                if (this.showAlerts) {
                    addAlert(message.type as "error" | "warning", errorMsg)
                }
                break
            case "data":
                data = message.data
                if (data) {
                    this.bibDB.saveBibEntries(data, true).then(
                        (idTranslations: IdTranslation[]) => {
                            const newIds = idTranslations.map(
                                idTrans => idTrans[1]
                            )
                            this.addToListCall(newIds)
                        }
                    )
                }
                break
            default:
                break
        }
        if (message.done && this.callback && typeof this.callback === "function") {
            this.callback()
        }
    }
}

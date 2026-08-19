import {
    BibLatexParser,
    CSLParser,
    CitaviParser,
    CitaviXmlParser,
    DocxCitationsParser,
    ENWParser,
    EndNoteParser,
    NBIBParser,
    OdtCitationsParser,
    RISParser
} from "bibliojson"
import {detectImportFormat} from "../format.js"

class BibliographyImportWorker {
    fileContents: string
    sendMessage: (msg: any) => void
    format: string | null
    tmpDB: Record<string, any> = {}
    bibKeys: string[] = []
    totalChunks = 0
    currentChunkNumber = 0

    constructor(
        fileContents: string,
        sendMessage: (msg: any) => void,
        format: string | null = null
    ) {
        this.fileContents = fileContents
        this.sendMessage = sendMessage
        this.format = format
    }

    init(): void {
        const detectedFormat = this.format || detectImportFormat(this.fileContents)

        if (!detectedFormat) {
            this.sendMessage({
                type: "error",
                errorCode: "unsupported_format",
                done: true
            })
            return
        }

        let parser: any
        let parseResult: {entries?: Record<string, any>}

        try {
            switch (detectedFormat) {
                case "bibliojson":
                    parseResult = {entries: JSON.parse(this.fileContents)}
                    break
                case "biblatex":
                    parser = new BibLatexParser(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "csl_json":
                    parser = new (CSLParser as any)(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "ris":
                    parser = new RISParser(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "enw":
                    parser = new ENWParser(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "nbib":
                    parser = new NBIBParser(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "endnote_xml":
                    parser = new (EndNoteParser as any)(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "citavi_xml":
                    parser = new CitaviXmlParser(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "citavi_json":
                    parser = new (CitaviParser as any)(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "odt_citations":
                    parser = new OdtCitationsParser(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "docx_citations":
                    parser = new DocxCitationsParser(this.fileContents)
                    parseResult = parser.parse()
                    break
                default:
                    this.sendMessage({
                        type: "error",
                        errorCode: "unsupported_format",
                        done: true
                    })
                    return
            }

            this.tmpDB = parseResult.entries || {}
            this.bibKeys = Object.keys(this.tmpDB)

            if (!this.bibKeys.length) {
                this.sendMessage({
                    type: "error",
                    errorCode: "no_entries",
                    done: true
                })
                return
            }

            this.bibKeys.forEach(bibKey => {
                const bibEntry = this.tmpDB[bibKey]
                bibEntry.cats = []
                if (!bibEntry.fields) {
                    bibEntry.fields = {}
                }
                if (!bibEntry.fields.title) {
                    bibEntry.fields.title = []
                }
                if (!bibEntry.fields.date) {
                    bibEntry.fields.date = "uuuu"
                }
                if (!bibEntry.fields.author && !bibEntry.fields.editor) {
                    bibEntry.fields.author = [{literal: []}]
                }
            })

            if (parser && parser.errors) {
                parser.errors.forEach((error: any) => {
                    this.sendMessage({
                        type: "error",
                        errorCode: "entry_error",
                        errorType: error.type || "unknown",
                        key: error.key,
                        entry: error.entry,
                        ...error
                    })
                })
            }

            if (parser && parser.warnings) {
                parser.warnings.forEach((warning: any) => {
                    this.sendMessage({
                        type: "warning",
                        errorCode: warning.type || "unknown",
                        ...warning
                    })
                })
            }

            this.totalChunks = Math.ceil(this.bibKeys.length / 50)
            this.currentChunkNumber = 0
            this.processChunk()
        } catch (error: any) {
            this.sendMessage({
                type: "error",
                errorCode: "parse_error",
                errorType: error.message || "unknown",
                done: true
            })
        }
    }

    processChunk(): void {
        if (this.currentChunkNumber < this.totalChunks) {
            const fromNumber = this.currentChunkNumber * 50
            const toNumber = fromNumber + 50
            const currentChunk: Record<string, any> = {}
            this.bibKeys.slice(fromNumber, toNumber).forEach(bibKey => {
                currentChunk[bibKey] = this.tmpDB[bibKey]
            })
            this.sendMessage({type: "data", data: currentChunk})
            this.currentChunkNumber++
            this.processChunk()
        } else {
            this.sendMessage({type: "ok", done: true})
        }
    }
}

addEventListener("message", message => {
    const {fileContents, format} = message.data
    const worker = new BibliographyImportWorker(
        fileContents,
        postMessage.bind(self),
        format
    )
    worker.init()
})

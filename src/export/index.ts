import {ZipFileCreator} from "fwtoolkit/file/zip"
import download from "downloadjs"
import type {BibDBCollection} from "../types/biblio.js"

export class BibLatexFileExporter {
    pks: number[]
    bibDB: BibDBCollection

    constructor(bibDB: BibDBCollection, pks: number[]) {
        this.pks = pks // A list of pk values of the bibliography items to be exported.
        this.bibDB = bibDB // The bibliography database to export from.
    }

    init(): void {
        import("bibliojson").then(({BibLatexExporter}) => {
            const exporter = new BibLatexExporter(
                this.bibDB.db,
                this.pks.map(String)
            )

            const zipper = new ZipFileCreator([
                {
                    filename: "bibliography.bib",
                    contents: exporter.parse()
                }
            ])
            zipper
                .init()
                .then(blob =>
                    download(blob, "bibliography.zip", "application/zip")
                )
        })
    }
}

export function exportBibFile(bibDB: BibDBCollection, pks: number[]): void {
    const exporter = new BibLatexFileExporter(bibDB, pks)
    exporter.init()
}

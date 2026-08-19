import {Dialog, initSettings} from "fwtoolkit"
import type {DialogButtonSpec} from "fwtoolkit/dialog"
import {
    BibEntryForm,
    BibliographyOverview,
    exportBibFileDialog,
    importBibFile
} from "../src/index.js"
import type {
    BibliographyApp,
    BibDBEntry,
    IdTranslation
} from "../src/types/biblio.js"
import {MockBibDB} from "./mock/mock-db.js"
import sampleBibliography from "./sample-bibliography.json"

initSettings({
    apiUrl: url => url,
    getCsrfToken: () => "",
    gettext: msgid => msgid,
    staticUrl: path => path
})

const mockDB = new MockBibDB()

const app: BibliographyApp = {
    bibDB: mockDB,
    isOffline: () => false,
    settings: {APPS: []},
    name: "Demo",
    apiConnectors: {
        bibliography: {
            getDB: async () => ({
                bib_categories: [],
                bib_list: [],
                last_modified: 0,
                number_of_entries: 0,
                user_id: 0
            }),
            saveBibEntries: async () => ({id_translations: []}),
            saveCategories: async () => ({entries: []}),
            deleteCategory: async () => new Response(),
            deleteBibEntries: async () => new Response()
        }
    }
}

function renderOverview(): Promise<BibliographyOverview> {
    const container = document.getElementById("bibliography") as HTMLElement
    const overview = new BibliographyOverview({app, container})
    return overview.init().then(() => overview)
}

const overviewReady = renderOverview()

function loadSample(): void {
    const ids: number[] = []
    Object.values(sampleBibliography).forEach(entry => {
        const bibEntry = {...entry, cats: []} as unknown as BibDBEntry
        ids.push(mockDB.addEntry(bibEntry))
    })
    overviewReady.then(overview => overview.updateTable(ids))
}

function addNewEntry(): void {
    const form = new BibEntryForm(mockDB, app)
    form.init().then((idTranslations: IdTranslation[] | void) => {
        if (!idTranslations) {
            return
        }
        overviewReady.then(overview =>
            overview.updateTable(idTranslations.map(idTrans => idTrans[1]))
        )
    })
}

function exportBibliography(): void {
    const ids = Object.keys(mockDB.db).map(id => Number.parseInt(id))
    exportBibFileDialog(mockDB, ids)
}

function showStartDialog(): void {
    const buttons: DialogButtonSpec[] = [
        {
            text: "Upload bibliography file",
            classes: "fw-dark",
            click: () => {
                dialog.close()
                importBibFile(
                    mockDB,
                    ids => overviewReady.then(overview => overview.updateTable(ids)),
                    app
                )
            }
        },
        {
            text: "Load sample bibliography",
            click: () => {
                dialog.close()
                loadSample()
            }
        },
        {
            text: "Start with empty bibliography",
            click: () => {
                dialog.close()
            }
        }
    ]

    const dialog = new Dialog({
        id: "demo-start",
        title: "Bibliography manager demo",
        width: 560,
        canClose: false,
        body: `<p>Welcome to the <code>@fiduswriter/bibliography-manager</code> demo.</p>
            <p>Choose how you would like to begin:</p>
            <ul class="demo-start-list">
                <li><strong>Upload a bibliography file</strong> &mdash; import from BibLaTeX/BibTeX, CSL-JSON, RIS, EndNote, Citavi, NBIB/PubMed, ODT/DOCX citations or BiblioJSON.</li>
                <li><strong>Load sample bibliography</strong> &mdash; start from a small built-in BiblioJSON dataset.</li>
                <li><strong>Start empty</strong> &mdash; begin with an empty bibliography and add entries manually.</li>
            </ul>`,
        buttons
    })
    dialog.open()
}

function bindToolbar(): void {
    const addButton = document.getElementById("demo-add-entry")
    const exportButton = document.getElementById("demo-export")
    addButton?.addEventListener("click", addNewEntry)
    exportButton?.addEventListener("click", exportBibliography)
}

bindToolbar()
showStartDialog()

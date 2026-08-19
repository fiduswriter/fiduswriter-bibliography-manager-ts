import {exportBibFileDialog} from "../export/index.js"
import {BibliographyFileImportDialog} from "../import/index.js"
import type {IdTranslation} from "../types/biblio.js"
import type {BibliographyOverview} from "./index.js"

export const bulkMenuModel = () => ({
    content: [
        {
            title: gettext("Delete selected"),
            tooltip: gettext("Delete selected bibliography entries."),
            action: (overview: BibliographyOverview) => {
                const ids = overview
                    .getSelected()
                    .map(id => Number.parseInt(String(id)))
                if (ids.length) {
                    overview.deleteBibEntryDialog(ids)
                }
            },
            disabled: (overview: BibliographyOverview) =>
                !overview.getSelected().length || overview.app.isOffline()
        },
        {
            title: gettext("Export selected"),
            tooltip: gettext("Export selected bibliography entries."),
            action: (overview: BibliographyOverview) => {
                const ids = overview
                    .getSelected()
                    .map(id => Number.parseInt(String(id)))
                if (ids.length) {
                    exportBibFileDialog(overview.app.bibDB, ids)
                }
            },
            disabled: (overview: BibliographyOverview) =>
                !overview.getSelected().length || overview.app.isOffline()
        }
    ]
})

export const menuModel = () => ({
    content: [
        {
            type: "dropdown",
            id: "cat_selector",
            keys: "Alt-c",
            content: [
                {
                    title: gettext("All categories"),
                    action: (_overview: BibliographyOverview) => {
                        const trs = document.querySelectorAll(
                            "#bibliography > tbody > tr"
                        )
                        trs.forEach(tr => ((tr as HTMLElement).style.display = ""))
                    }
                }
            ],
            order: 1
        },
        {
            type: "text",
            title: gettext("Edit categories"),
            keys: "Alt-e",
            action: (overview: BibliographyOverview) => overview.editCategoriesDialog(),
            order: 2
        },
        {
            type: "text",
            title: gettext("Register new source"),
            keys: "Alt-n",
            action: (overview: BibliographyOverview) => {
                import("../form/index.js").then(({BibEntryForm}) => {
                    const form = new BibEntryForm(
                        overview.app.bibDB,
                        overview.app
                    )
                    form.init().then((idTranslations: IdTranslation[] | void) => {
                        if (!idTranslations) {
                            return
                        }
                        const ids = idTranslations.map(idTrans => idTrans[1])
                        return overview.updateTable(ids)
                    })
                })
            },
            order: 3
        },
        {
            type: "text",
            title: gettext("Import bibliography"),
            keys: "Alt-u",
            action: (overview: BibliographyOverview) => {
                const fileImporter = new BibliographyFileImportDialog(
                    overview.app.bibDB,
                    ids => overview.updateTable(ids),
                    overview.app
                )
                fileImporter.init()
            },
            order: 4
        },
        {
            type: "text",
            title: gettext("Export bibliography"),
            keys: "Alt-x",
            action: (overview: BibliographyOverview) => {
                const ids = Object.keys(overview.app.bibDB.db).map(id =>
                    Number.parseInt(id)
                )
                exportBibFileDialog(overview.app.bibDB, ids)
            },
            order: 5
        },
        {
            type: "search",
            icon: "search",
            title: gettext("Search bibliography"),
            keys: "Alt-s",
            input: (overview: BibliographyOverview, text: string) =>
                overview.table!.search(text),
            order: 6
        }
    ]
})

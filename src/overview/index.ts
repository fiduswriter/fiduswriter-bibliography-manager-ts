import fixUTF8 from "fix-utf8"

import {
    Dialog,
    OverviewDataTable,
    OverviewMenuView,
    addAlert,
    ensureCSS,
    escapeText,
    findTarget,
    isActivationEvent,
    setDocTitle,
    whenReady
} from "fwtoolkit"
import type {DialogButtonSpec} from "fwtoolkit/dialog"
import type {DatatableBulk} from "fwtoolkit"
import type {OverviewMenuModel} from "fwtoolkit/overview_menu"
import type {ContentMenuInit} from "fwtoolkit/content_menu"
import type {DataTable} from "simple-datatables"
import {plugins as defaultBibPlugins} from "../plugins/bibliography_overview/index.js"
import {getBibTypeTitle} from "../form/strings.js"
import {litToText, nameToText} from "../tools.js"
import type {
    BibCategory,
    BibliographyApp,
    IdTranslation,
    NameDictObject,
    NodeArray
} from "../types/biblio.js"
import {bulkMenuModel, menuModel} from "./menu.js"
import {bibliographyOverviewTemplate, editCategoriesTemplate} from "./templates.js"

interface PluginExport {
    new (overview: BibliographyOverview): {init: () => Promise<unknown> | void}
    name: string
}

type BibPlugin = [string, Record<string, PluginExport>]

export class BibliographyOverview {
    app: BibliographyApp
    container: HTMLElement
    bibPlugins: BibPlugin[]
    lastSort: {column: number; dir: "asc" | "desc"}
    dom!: HTMLElement
    overviewTable?: OverviewDataTable
    table?: DataTable
    dtBulk?: DatatableBulk
    menu?: OverviewMenuView
    plugins?: Record<string, {init: () => Promise<unknown> | void}>
    _boundHandleActivation?: (event: Event) => void

    constructor(
        {app, container}: {app: BibliographyApp; container: HTMLElement},
        bibPlugins: BibPlugin[] = defaultBibPlugins as BibPlugin[]
    ) {
        this.app = app
        this.container = container
        this.bibPlugins = bibPlugins

        this.lastSort = {column: 0, dir: "asc"}
    }

    /** Bind the init function to doc loading.
     * @function bind
     */
    init(): Promise<void> {
        return whenReady().then(() => {
            this.render()
            this.menu = new OverviewMenuView(
                this,
                menuModel as () => OverviewMenuModel
            )
            this.menu.init()
            this.setBibCategoryList(this.app.bibDB.cats)
            this.initTable(Object.keys(this.app.bibDB.db))
            // Reset scroll position to top to prevent Safari from auto-scrolling
            // to the focused table element, which would hide the header/menu
            window.scrollTo(0, 0)
            this.activatePlugins()
            this.bindEvents()
        })
    }

    render(): void {
        this.dom = this.container
        this.dom.innerHTML = bibliographyOverviewTemplate()
        ensureCSS([
            staticUrl("css/bibliography/bibliography.css"),
            staticUrl("css/prosemirror.css"),
            staticUrl("css/inline_tools.css")
        ])
        setDocTitle(gettext("Bibliography Manager"), this.app)
    }

    onResize(): void {
        if (!this.table) {
            return
        }
        this.initTable(Object.keys(this.app.bibDB.db))
    }

    /* Initialize the overview table */
    initTable(ids: string[]): void {
        if (this.overviewTable) {
            this.overviewTable.destroy()
            this.overviewTable = undefined
        }
        this.table = undefined
        this.dtBulk = undefined

        const contentsEl = this.dom as HTMLElement
        contentsEl.innerHTML = ""

        const hiddenCols: number[] = [0]

        if (window.innerWidth < 500) {
            hiddenCols.push(1)
            if (window.innerWidth < 450) {
                hiddenCols.push(3)
            }
        }

        this.overviewTable = new OverviewDataTable({
            dom: contentsEl,
            classes: ["fw-data-table", "fw-large"],
            columns: [
                {
                    select: 0,
                    type: "number"
                },
                {
                    select: 1,
                    type: "boolean",
                    sortable: false
                },
                {
                    select: hiddenCols,
                    hidden: true
                },
                {
                    select: 6,
                    sortable: false
                },
                {
                    select: [this.lastSort.column],
                    sort: this.lastSort.dir
                }
            ],
            data: ids.map(id => this.createTableRow(id)),
            idColumn: 0,
            checkboxColumn: 1,
            bulkMenu: bulkMenuModel() as unknown as ContentMenuInit,
            bulkMenuPage: this as Record<string, unknown>,
            searchable: true,
            scrollY: `${Math.max(window.innerHeight - 360, 100)}px`,
            tabIndex: 1,
            labels: {
                noRows: gettext("No sources registered"),
                noResults: gettext("No sources found") // Message shown when there are no search results
            },
            headings: [
                "",
                "",
                gettext("Title"),
                gettext("Sourcetype"),
                gettext("Author"),
                gettext("Published"),
                ""
            ],
            template: (options, _dom) =>
                `<div class='${options.classes.container}'${options.scrollY.length ? ` style='height: ${options.scrollY}; overflow-Y: auto;'` : ""}></div>`,
            rowRender: (row, tr, _index) => {
                const id = row.cells[0].data
                const inputNode: {
                    nodeName: string
                    attributes: Record<string, string | boolean | number>
                } = {
                    nodeName: "input",
                    attributes: {
                        type: "checkbox",
                        class: "entry-select fw-check",
                        "data-id": id as number,
                        id: `bib-${id}`
                    }
                }
                if (row.cells[1].data) {
                    inputNode.attributes.checked = true
                }
                ;(tr as {childNodes: {childNodes: unknown[]}[]}).childNodes[0].childNodes = [
                    inputNode,
                    {
                        nodeName: "label",
                        attributes: {
                            for: `bib-${id}`
                        }
                    }
                ]
            },
            onEnter: (row, _event) => {
                if (this.getSelected().length > 0) {
                    return
                }
                const rowIndex = this.table!.data.data.indexOf(row as never)
                const editButton = this.table!.dom.querySelector(
                    `tr[data-index="${rowIndex}"] span.edit-bib`
                )
                if (editButton) {
                    ;(editButton as HTMLElement).click()
                }
            },
            onDelete: row => {
                const bibId = row.cells[0].data as number
                this.deleteBibEntryDialog([bibId])
            }
        })
        this.overviewTable.init()
        this.table = this.overviewTable.table as DataTable
        ;(this.table as unknown as {id: string}).id = "bibliography"
        this.dtBulk = this.overviewTable.dtBulk

        this.table.on("datatable.sort", (column, dir) => {
            this.lastSort = {column, dir}
        })

        this.table.dom.focus()
    }

    /** Adds a list of bibliography categories to current list of bibliography categories.
     * @function setBibCategoryList
     * @param newBibCategories The new categories which will be added to the existing ones.
     */
    setBibCategoryList(bibCategories: BibCategory[]): void {
        const catSelector = this.menu!.model.content.find(
            menuItem => menuItem.id === "cat_selector"
        )
        if (!catSelector) {
            return
        }
        const dropdown = catSelector as {
            content: {type?: string; title?: string; action?: unknown}[]
        }
        dropdown.content = dropdown.content.filter(cat => cat.type !== "category")

        dropdown.content = dropdown.content.concat(
            bibCategories.map(cat => ({
                title: cat.category_title,
                type: "category",
                action: (_overview: BibliographyOverview) => {
                    const trs = this.dom.querySelectorAll(
                        "#bibliography > tbody > tr"
                    )
                    trs.forEach(tr => {
                        const titleEl = tr.querySelector(".fw-data-table-title")
                        if (
                            titleEl &&
                            titleEl.classList.contains(`cat_${cat.id}`)
                        ) {
                            ;(tr as HTMLElement).style.display = ""
                        } else {
                            ;(tr as HTMLElement).style.display = "none"
                        }
                    })
                }
            }))
        )
        this.menu!.update()
    }

    /** This takes a list of new bib entries and adds them to BibDB and the bibliography table
     * @function updateTable
     */
    updateTable(ids: number[]): void {
        // Remove items that already exist
        this.removeTableRows(ids)
        this.table!.insert({data: ids.map(id => this.createTableRow(id))})
        // Redo last sort
        this.table!.columns.sort(this.lastSort.column, this.lastSort.dir)
    }

    createTableRow(id: string | number): (string | number | boolean)[] {
        const bibInfo = this.app.bibDB.db[id as number]
        const bibauthors = bibInfo.fields.author || bibInfo.fields.editor
        const cats = bibInfo.cats.map(cat => `cat_${cat}`)
        return [
            id as number,
            false, // checkbox
            `<span class="fw-data-table-title ${cats.join(" ")}">
                <i class="fa fa-book"></i>
                <span class="edit-bib fw-link-text fw-searchable" data-id="${id}">
                    ${(bibInfo.fields.title as NodeArray | undefined)?.length ? escapeText(litToText(bibInfo.fields.title as NodeArray)) : gettext("Untitled")}
                </span>
                ${bibInfo.entry_key ? `<small class="bib-entry-key">${escapeText(bibInfo.entry_key)}</small>` : ""}
            </span>`, // title
            getBibTypeTitle(bibInfo.bib_type), // sourcetype
            bibauthors ? nameToText(bibauthors as NameDictObject[]) : "", // author
            `<span class="fw-date">${bibInfo.fields.date ? (bibInfo.fields.date as string).replace("/", " ") : ""}</span>`, // published,
            `<span class="delete-bib fw-link-text" data-id="${id}"><i class="fa fa-trash-alt">  </i></span>` // delete icon
        ]
    }

    removeTableRows(ids: number[]): void {
        const existingRows = this.table!.data.data
            .map((row, index) => {
                const id = row.cells[0].data as number
                if (ids.includes(id)) {
                    return index
                } else {
                    return false
                }
            })
            .filter(rowIndex => rowIndex !== false)

        if (existingRows.length) {
            this.table!.rows.remove(existingRows as number[])
        }
    }

    /** Opens a dialog for editing categories.
     * @function editCategoriesDialog
     */
    editCategoriesDialog(): void {
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
                text: gettext("Submit"),
                classes: "fw-dark",
                click: () => {
                    const cats: {ids: number[]; titles: string[]} = {
                        ids: [],
                        titles: []
                    }
                    document
                        .querySelectorAll("#edit-categories .category-form")
                        .forEach(el => {
                            const title = (el as HTMLInputElement).value.trim()
                            if (title.length) {
                                cats.ids.push(
                                    Number.parseInt(
                                        el.getAttribute("data-id") || "0"
                                    )
                                )
                                cats.titles.push(title)
                            }
                        })
                    if (this.app.isOffline()) {
                        addAlert(
                            "info",
                            gettext(
                                "You are currently offline. Please try again when you are back online."
                            )
                        )
                    } else {
                        this.saveCategories(cats)
                    }
                    dialog.close()
                }
            },
            {
                type: "cancel"
            }
        ]

        const dialog = new Dialog({
            id: "edit-categories",
            width: 420,
            height: 350,
            title: gettext("Edit Categories"),
            body: editCategoriesTemplate({
                categories: this.app.bibDB.cats
            }),
            buttons
        })
        dialog.open()
    }

    /** Dialog to confirm deletion of bibliography items.
     * @function deleteBibEntryDialog
     * @param ids Ids of items that are to be deleted.
     */
    deleteBibEntryDialog(ids: number[]): void {
        const buttons: DialogButtonSpec[] = [
            {
                text: gettext("Delete"),
                classes: "fw-dark",
                click: () => {
                    this.deleteBibEntries(ids)
                    dialog.close()
                }
            },
            {
                type: "cancel"
            }
        ]

        const dialog = new Dialog({
            id: "confirmdeletion",
            title: gettext("Confirm deletion"),
            body: `<p>${gettext("Delete the bibliography item(s)")}?</p>`,
            buttons,
            icon: "exclamation-triangle"
        })
        dialog.open()
    }

    // get IDs of selected bib entries
    getSelected(): number[] {
        return Array.from(
            this.dom.querySelectorAll(".entry-select:checked:not(:disabled)")
        ).map(el => Number.parseInt(el.getAttribute("data-id") || ""))
    }

    activatePlugins(): Promise<unknown> | void {
        if (this.plugins) {
            // Plugins have been activated already
            return
        }
        // Add plugins.
        this.plugins = {}

        return Promise.all(
            this.bibPlugins.map(([app, plugin]) => {
                if (!this.app.settings.APPS.includes(app)) {
                    return Promise.resolve()
                }
                return Promise.all(
                    Object.values(plugin).map(pluginExport => {
                        if (typeof pluginExport === "function") {
                            this.plugins![pluginExport.name] = new pluginExport(
                                this
                            )
                            return (
                                this.plugins![pluginExport.name].init() ||
                                Promise.resolve()
                            )
                        }
                        return Promise.resolve()
                    })
                )
            })
        )
    }

    /** Initialize the bibliography table and bind interactive parts.
     * @function bibEvents
     */
    bindEvents(): void {
        this._boundHandleActivation = (event: Event) =>
            this.handleActivation(event)
        document.body.addEventListener("click", this._boundHandleActivation)
        document.body.addEventListener("keydown", this._boundHandleActivation)

        // Allow pasting of bibtex data.
        this.dom.addEventListener("paste", event => {
            if ((event.target as Element).nodeName === "INPUT") {
                // We are inside of an input element, cancel.
                return false
            }
            if (!event.clipboardData) {
                return false
            }
            const text = event.clipboardData.getData("text")
            return this.getBibtex(text)
        })

        // The two drag events are needed to allow dropping
        this.dom.addEventListener("dragover", event => {
            if (
                event.dataTransfer &&
                event.dataTransfer.types.includes("text/plain")
            ) {
                event.preventDefault()
            }
        })

        this.dom.addEventListener("dragenter", event => {
            if (
                event.dataTransfer &&
                event.dataTransfer.types.includes("text/plain")
            ) {
                event.preventDefault()
            }
        })

        // Allow dropping of bibtex data
        this.dom.addEventListener("drop", event => {
            if ((event.target as Element).nodeName === "INPUT") {
                // We are inside of an input element, cancel.
                return false
            }
            if (!event.dataTransfer) {
                return false
            }
            const text = fixUTF8(event.dataTransfer.getData("text"))
            return this.getBibtex(text)
        })
    }

    handleActivation(event: Event): void {
        if (!isActivationEvent(event)) {
            return
        }
        const el: {target?: Element | null} = {}
        switch (true) {
            case findTarget(event, ".delete-bib", el): {
                const bibId = Number.parseInt(
                    (el.target as HTMLElement).dataset.id || ""
                )
                this.deleteBibEntryDialog([bibId])
                break
            }
            case findTarget(event, ".edit-bib", el): {
                const bibId = Number.parseInt(
                    (el.target as HTMLElement).dataset.id || ""
                )
                import("../form/index.js").then(({BibEntryForm}) => {
                    const form = new BibEntryForm(
                        this.app.bibDB,
                        this.app,
                        bibId
                    )
                    form.init().then((idTranslations: IdTranslation[] | void) => {
                        if (!idTranslations) {
                            return
                        }
                        const ids = idTranslations.map(idTrans => idTrans[1])
                        return this.updateTable(ids)
                    })
                })
                break
            }
            case findTarget(event, ".fw-add-input", el): {
                const itemEl = (el.target as HTMLElement).closest(".fw-list-input")
                if (!itemEl) {
                    break
                }
                if (!itemEl.nextElementSibling) {
                    itemEl.insertAdjacentHTML(
                        "afterend",
                        `<tr class="fw-list-input">
                            <td>
                                <input type="text" class="category-form">
                                <span class="fw-add-input icon-addremove" tabindex="0"></span>
                            </td>
                        </tr>`
                    )
                } else {
                    itemEl.parentElement!.removeChild(itemEl)
                }
                break
            }
            case event.type === "keydown" &&
                (event.target as Element).matches(".category-form"): {
                const input = event.target as HTMLInputElement
                if (!input.value.trim().length) {
                    break
                }
                const itemEl = input.closest(
                    ".fw-list-input"
                )
                if (!itemEl?.nextElementSibling) {
                    itemEl?.insertAdjacentHTML(
                        "afterend",
                        `<tr class="fw-list-input">
                            <td>
                                <input type="text" class="category-form">
                                <span class="fw-add-input icon-addremove" tabindex="0"></span>
                            </td>
                        </tr>`
                    )
                    const newInput = itemEl?.nextElementSibling?.querySelector(
                        ".category-form"
                    ) as HTMLInputElement | null
                    newInput?.focus()
                }
                break
            }
            default:
                break
        }
    }

    // find bibtex in pasted or dropped data.
    getBibtex(text: string): boolean {
        import("../import/index.js").then(({BibliographyImporter}) => {
            const importer = new BibliographyImporter(
                text,
                this.app.bibDB,
                newIds => this.updateTable(newIds),
                false
            )
            importer.init()
        })
        return true
    }

    saveCategories(cats: {ids: number[]; titles: string[]}): void {
        this.app.bibDB
            .saveCategories(cats)
            .then(bibCats => this.setBibCategoryList(bibCats))
    }

    deleteBibEntries(ids: number[]): void {
        this.app.bibDB
            .deleteBibEntries(ids)
            .then(ids => this.removeTableRows(ids))
    }

    close(): void {
        if (this.table) {
            this.table.destroy()
            this.table = undefined
        }
        if (this.dtBulk) {
            this.dtBulk.destroy()
            this.dtBulk = undefined
        }
        if (this.menu) {
            this.menu.destroy()
            this.menu = undefined
        }
        if (this._boundHandleActivation) {
            document.body.removeEventListener(
                "click",
                this._boundHandleActivation
            )
            document.body.removeEventListener(
                "keydown",
                this._boundHandleActivation
            )
            this._boundHandleActivation = undefined
        }
    }
}

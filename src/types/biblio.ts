import {BibFieldTypes, BibTypes} from "bibliojson"
import type {BibDB as BiblioBibDB} from "bibliojson"

// Derive bibliojson's `EntryObject` from its exported `BibDB` type so we can
// extend it without importing the unexported `EntryObject` symbol.
export type EntryObject = BiblioBibDB[number]

// Derive the bibliojson field/type descriptors from their runtime objects.
export type BibFieldType = (typeof BibFieldTypes)[string] & {title?: string}
export type BibType = (typeof BibTypes)[string]

// Local types that mirror the shapes declared by bibliojson but are not
// exported from that package.

export interface MarkObject {
    type: string
}

export interface TextNodeObject {
    type: "text"
    text: string
    marks?: MarkObject[]
    attrs?: Record<string, unknown>
}

export interface OtherNodeObject {
    type: string
    marks?: MarkObject[]
    attrs?: Record<string, unknown>
}

export type NodeObject = OtherNodeObject | TextNodeObject

export type NodeArray = NodeObject[]

export type NameDictObject = {
    literal?: NodeArray
    family?: NodeArray
    given?: NodeArray
    prefix?: NodeArray
    suffix?: NodeArray
    useprefix?: boolean
}

export type RangeArray = [NodeArray, NodeArray] | [NodeArray]

/** A single bibliography category stored on the client. */
export interface BibCategory {
    id: number
    category_title: string
}

/** Client-side bibliography entry.
 *
 * Composes bibliojson's `EntryObject` with the extra `cats` field and the
 * server-side `id` the Fidus Writer backend attaches to each entry.
 */
export interface BibDBEntry extends EntryObject {
    /** Categories the entry belongs to. */
    cats: number[]
    /** Server-side primary key (present in entries received from the server). */
    id?: number
}

/** Client-side bibliography database, keyed by server id. */
export type BibDB = Record<number, BibDBEntry>

/** Translation of a temporary client-side id to the server-side id. */
export type IdTranslation = [number, number]

/** Single bibliography item as returned in the server's `bib_list` array. */
export interface ServerBibItem {
    id: number
    bibDBEntry: BibDBEntry
}

/** Shape of the response from `POST /api/bibliography/biblist/`. */
export interface BiblistResponse {
    bib_categories: BibCategory[]
    bib_list?: BibDBEntry[]
    last_modified: number
    number_of_entries: number
    user_id: number
}

/** Shape of the request body for `POST /api/bibliography/save/`. */
export interface SaveBibEntriesRequest {
    is_new: boolean
    bibs: Record<number, BibDBEntry>
}

/** Shape of the response from `POST /api/bibliography/save/`. */
export interface SaveBibEntriesResponse {
    id_translations: IdTranslation[]
}

/** Shape of the request body for `POST /api/bibliography/save_category/`. */
export interface SaveCategoriesRequest {
    ids: number[]
    titles: string[]
}

/** Shape of the response from `POST /api/bibliography/save_category/`. */
export interface SaveCategoriesResponse {
    entries: BibCategory[]
}

/** Shape of the request body for `POST /api/bibliography/delete_category/`. */
export interface DeleteCategoryRequest {
    ids: number[]
}

/** Shape of the request body for `POST /api/bibliography/delete/`. */
export interface DeleteBibEntriesRequest {
    ids: number[]
}

/** Union of all possible field values handled by the form field classes. */
export type FieldValue =
    | string
    | number
    | boolean
    | NodeArray
    | NameDictObject[]
    | RangeArray[]
    | string[]
    | number[]

/** Common interface implemented by every bibliography form field class. */
export interface FieldForm {
    init(): void
    readonly value: unknown
    check(): boolean
}

/** Constructor signature for a class that implements `FieldForm`. */
export interface FieldFormConstructor {
    new (
        dom: HTMLElement,
        initialValue?: unknown,
        placeHolder?: string | false,
        fieldType?: BibFieldType
    ): FieldForm
}

/** Map from `BibFieldType.type` to the form field class that renders it. */
export type FieldFormsMap = Record<string, FieldFormConstructor | undefined>

/** Object describing the current values of a bibliography entry being edited. */
export interface CurrentBibValues {
    bib_type: string | false
    cats: number[]
    entry_key: string
    fields: Record<string, unknown>
}

/** Shape returned by `BibEntryForm.value`. */
export interface FormValue {
    bib_type: string
    cats: (string | number)[]
    entry_key: string
    fields: Record<string, unknown>
}

/** Operations exposed by the bibliography database manager. */
export interface BibDBCollection {
    db: BibDB
    cats: BibCategory[]
    saveBibEntries(
        tmpDB: Record<number, BibDBEntry>,
        isNew: boolean
    ): Promise<IdTranslation[]>
    saveCategories(cats: SaveCategoriesRequest): Promise<BibCategory[]>
    deleteBibEntries(ids: number[]): Promise<number[]>
}

/** API connector for bibliography server operations. */
export interface BibliographyApi {
    getDB(
        lastModified: number,
        numberOfEntries: number,
        localStorageOwnerId: number
    ): Promise<BiblistResponse>
    saveBibEntries(
        tmpDB: Record<number, BibDBEntry>,
        isNew: boolean
    ): Promise<SaveBibEntriesResponse>
    saveCategories(
        cats: SaveCategoriesRequest
    ): Promise<SaveCategoriesResponse>
    deleteCategory(ids: number[]): Promise<Response>
    deleteBibEntries(ids: number[]): Promise<Response>
}

/**
 * Host-provided file picker for bibliography import.
 *
 * Mirrors `ImagePicker` from `@fiduswriter/image-manager`: hosts that cannot
 * use a browser `<input type="file">` (the desktop app opens a native OS
 * dialog) supply this instead, and it resolves with the picked `File`, or with
 * `null`/`undefined` when the user cancelled.
 */
export type FilePicker = (options?: {
    /** Accepted extensions, without a leading dot, e.g. `["bib", "json"]`. */
    extensions?: string[]
}) => Promise<File | null | undefined>

/** Subset of the main Fidus Writer app object used by bibliography code. */
export interface BibliographyApp {
    bibDB: BibDBCollection
    isOffline: () => boolean
    settings: {
        APPS: string[]
    }
    name: string
    apiConnectors: {
        bibliography: BibliographyApi
    }
    /** Optional host-provided file picker (see {@link FilePicker}). */
    filePicker?: FilePicker
}

// Maintain the legacy `BibDB` alias for bibliojson's type as well, but export
// our own BibDB as the primary type.
export type {BiblioBibDB}

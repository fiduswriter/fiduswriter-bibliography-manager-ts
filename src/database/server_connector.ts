import type {
    BibCategory,
    BibDBEntry,
    BibliographyApi,
    IdTranslation,
    SaveCategoriesRequest,
    ServerBibItem
} from "../types/biblio.js"

// class for server calls of BibliographyDB.
export class BibliographyDBServerConnector {
    bibliographyApi: BibliographyApi

    constructor(bibliographyApi: BibliographyApi) {
        this.bibliographyApi = bibliographyApi
    }

    getDB(
        lastModified: number,
        numberOfEntries: number,
        localStorageOwnerId: number
    ): Promise<{
        bibCats: BibCategory[]
        bibList: ServerBibItem[] | false
        lastModified: number
        numberOfEntries: number
        userId: number
    }> {
        return this.bibliographyApi
            .getDB(lastModified, numberOfEntries, localStorageOwnerId)
            .then(response => {
                return {
                bibCats: response["bib_categories"],
                bibList: response.hasOwnProperty("bib_list")
                    ? (response["bib_list"] as BibDBEntry[]).map(item =>
                          this.serverBibItemToBibDB(item)
                      )
                    : false,
                lastModified: response["last_modified"],
                numberOfEntries: response["number_of_entries"],
                userId: response["user_id"]
            }
        })
    }

    /** Converts a bibliography item as it arrives from the server to a BibDB object.
     * @function serverBibItemToBibDB
     * @param item The bibliography item from the server.
     */
    serverBibItemToBibDB(bibDBEntry: BibDBEntry): ServerBibItem {
        return {
            id: (bibDBEntry as BibDBEntry & {id: number}).id,
            bibDBEntry
        }
    }

    saveBibEntries(
        tmpDB: Record<number, BibDBEntry>,
        isNew: boolean
    ): Promise<IdTranslation[]> {
        return this.bibliographyApi
            .saveBibEntries(tmpDB, isNew)
            .then(response => response.id_translations)
    }

    saveCategories(cats: SaveCategoriesRequest): Promise<BibCategory[]> {
        return this.bibliographyApi.saveCategories(cats).then(
            response => response.entries
        )
    }

    deleteCategory(ids: number[]): Promise<Response> {
        return this.bibliographyApi.deleteCategory(ids)
    }

    deleteBibEntries(ids: number[]): Promise<Response> {
        return this.bibliographyApi.deleteBibEntries(ids)
    }
}

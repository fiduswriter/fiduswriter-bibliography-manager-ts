import {sniffFormat} from "bibliojson"

/**
 * Detect the format of a raw bibliography string.
 *
 * `sniffFormat` from bibliojson recognises every external import format
 * (BibLaTeX, CSL-JSON, RIS, ENW, NBIB, EndNote XML, Citavi XML/JSON, ODT/DOCX
 * citations) but not the native BiblioJSON format, since that format is not
 * produced by an external reference manager. We detect it here first so that
 * BiblioJSON files round-trip through the same import path.
 */

export function isBiblioJSON(value: unknown): boolean {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false
    }
    const entries = Object.values(value as Record<string, unknown>)
    if (!entries.length) {
        // An empty object is ambiguous, but treat it as an empty BiblioJSON db.
        return true
    }
    return entries.every(
        entry =>
            entry !== null &&
            typeof entry === "object" &&
            typeof (entry as Record<string, unknown>).bib_type === "string" &&
            (entry as Record<string, unknown>).fields !== null &&
            typeof (entry as Record<string, unknown>).fields === "object"
    )
}

export function detectImportFormat(content: string): string | null {
    if (typeof content !== "string" || content.length === 0) {
        return null
    }
    const trimmed = content.trimStart()
    if (trimmed.startsWith("{")) {
        try {
            const parsed = JSON.parse(trimmed)
            if (isBiblioJSON(parsed)) {
                return "bibliojson"
            }
        } catch {
            // Not valid JSON; fall through to the regular sniffer.
        }
    }
    return sniffFormat(content)
}

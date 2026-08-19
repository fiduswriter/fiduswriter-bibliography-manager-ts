// Ambient declarations for dependencies without bundled types.

declare module "tokenfield" {
    export interface TokenFieldItem {
        id: number
        name: string
    }

    export interface TokenFieldOptions {
        el: HTMLInputElement
        setItems?: TokenFieldItem[]
        keys?: Record<number, string>
    }

    export default class TokenField {
        constructor(options: TokenFieldOptions)
        getItems(): TokenFieldItem[]
    }
}

declare module "fix-utf8" {
    function fixUTF8(str: string): string
    export default fixUTF8
}

declare module "fwtoolkit/file/zip" {
    export interface ZipFileSpec {
        filename: string
        contents: string
    }

    export class ZipFileCreator {
        constructor(files: ZipFileSpec[])
        init(): Promise<Blob>
    }
}

// Globals provided by the Fidus Writer host page.

declare function gettext(msgid: string): string

declare function interpolate(
    fmt: string,
    args: unknown[],
    named?: boolean
): string

declare function staticUrl(path: string): string

declare const settings: Record<string, unknown>

interface Window {
    settings?: Record<string, unknown>
    csrfToken?: string
}

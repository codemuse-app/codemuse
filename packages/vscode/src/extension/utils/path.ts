import { normalize } from "path"

export const norm = (path: string) => {
    return normalize(path).replace(/\\/g, "/")
}
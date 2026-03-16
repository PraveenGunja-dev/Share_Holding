/// <reference types="vite/client" />

declare module "path" {
    export function resolve(...pathSegments: string[]): string;
    export function dirname(path: string): string;
    const path: {
        resolve: typeof resolve;
        dirname: typeof dirname;
    }
    export default path;
}

declare module "url" {
    export function fileURLToPath(url: string | URL): string;
}

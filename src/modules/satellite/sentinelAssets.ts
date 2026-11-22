/// <reference types="vite/client" />

export const SENTINEL_COLOR = '#0284c7'

export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`
}

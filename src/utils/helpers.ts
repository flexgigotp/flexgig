export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function truncateString(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function isEmptyObject(obj: Record<string, any>): boolean {
  return Object.keys(obj).length === 0
}

export function mergeObjects<T extends Record<string, any>>(...objects: T[]): T {
  return objects.reduce((acc, obj) => ({ ...acc, ...obj }), {} as T)
}

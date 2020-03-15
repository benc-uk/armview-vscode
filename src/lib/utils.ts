//
// utils.ts - Simple utility functions
// Static helper functions
// Ben Coleman, 2017 & 2019
//

// Hashing function
export function hashCode(str: string): any {
  let hash = 0
  let i
  let chr
  if (str.length === 0) return hash
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0 // Convert to 32bit integer
  }
  return hash
}

// Custom string encoder which also encodes single quotes
export function encode(str: string): string {
  let temp = encodeURIComponent(str)
  temp = temp.replace(/'/g, '%27')
  return temp
}

//
// Stolen from https://github.com/github/fetch/issues/175
// And TypeScript-ified by me
//
export function timeoutPromise<T>(ms: number, promise: Promise<T>, msg?: string): Promise<T> {
  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | undefined = setTimeout(() => {
      timeoutId = undefined
      reject(new Error(msg || 'Promise timeout'))
    }, ms)
    promise.then(
      (res: T) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
          resolve(res)
        }
      },
      (err: any) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
          reject(err)
        }
      },
    )
  })
}

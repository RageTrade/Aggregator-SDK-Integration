export const AEVO_ERRORS = ['Aevo credentials missing', 'headers not set'].map((e) => e.toLowerCase())

export async function errorCatcher<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn()
  } catch (e: any) {
    if ('message' in e && AEVO_ERRORS.includes(e.message.toLowerCase())) {
      console.error(`Aevo credentials missing: Doing Early return`)
    } else {
      throw e
    }
  }
}

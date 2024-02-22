export const AEVO_CREDENTIAL_MISSING_ERROR = new Error('Aevo credentials missing')

export async function errorCatcher<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn()
  } catch (e) {
    if (e === AEVO_CREDENTIAL_MISSING_ERROR) {
      console.error(`Aevo credentials missing: Doing Early return`)
    } else {
      throw e
    }
  }
}

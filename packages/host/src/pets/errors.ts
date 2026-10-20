/**
 * One refusal from the pets routes, carrying the HTTP status it answers with.
 * The routes send `message` as the reason and never a filesystem path: the
 * browser half shows it to the reader.
 */
export class PetRefusal extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409 | 413 | 415 | 502) {
    super(message)
    this.name = 'PetRefusal'
  }
}

export class MissingRowIdException extends Error {
  public readonly path: string;

  constructor(dataModelPath: string) {
    super(`Missing row ID in data model for ${dataModelPath}`);
    this.path = dataModelPath;
  }
}

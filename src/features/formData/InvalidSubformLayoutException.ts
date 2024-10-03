export class InvalidSubformLayoutException extends Error {
  public readonly id: string;
  constructor(id: string) {
    super(`The layout set with id '${id}' cannot have both type "subform" and a task association.`);
    this.id = id;
  }
}

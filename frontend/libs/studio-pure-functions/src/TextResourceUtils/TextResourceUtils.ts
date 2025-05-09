import type { TextResource } from '../types/TextResource';

export class TextResourceUtils {
  private readonly textResources: TextResource[];

  constructor(textResources: TextResource[]) {
    this.textResources = textResources;
  }

  public get(id: string): TextResource | undefined {
    return this.textResources.find((textResource) => textResource.id === id);
  }

  public add(textResource: TextResource): TextResource[] {
    return [...this.textResources, textResource];
  }

  public update(textResource: TextResource): TextResource[] {
    return this.textResources.map((tr) => (tr.id === textResource.id ? textResource : tr));
  }

  public remove(id: string): TextResource[] {
    return this.textResources.filter((textResource) => textResource.id !== id);
  }
}

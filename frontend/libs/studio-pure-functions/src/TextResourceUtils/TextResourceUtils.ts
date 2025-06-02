import type { TextResource } from '../types/TextResource';
import type { TextResourceMap } from '../types/TextResourceMap';
import type { TextResourcesWithLanguage } from '../types/TextResourcesWithLanguage';

export class TextResourceUtils {
  private readonly textResources: TextResourceMap;

  constructor(textResources: TextResourceMap) {
    this.textResources = textResources;
  }

  public static fromArray(textResourceList: TextResource[]): TextResourceUtils {
    const entries: Array<[string, TextResource]> = textResourceList.map((textResource) => [
      textResource.id,
      textResource,
    ]);
    const textResourceMap = new Map<string, TextResource>(entries);
    return new TextResourceUtils(textResourceMap);
  }

  public asArray(): TextResource[] {
    return Array.from(this.textResources.values());
  }

  public get(id: string): TextResource | undefined {
    return this.textResources.get(id);
  }

  public getValueIfExists(id: string): string | null {
    const textResource = this.get(id);
    return textResource ? textResource.value : null;
  }

  public withLanguage(language: string): TextResourcesWithLanguage {
    return {
      language,
      resources: this.asArray(),
    };
  }

  public set(textResource: TextResource): TextResourceUtils {
    const newMap = this.cloneMap();
    newMap.set(textResource.id, textResource);
    return new TextResourceUtils(newMap);
  }

  public setValues(updates: Record<string, string>): TextResourceUtils {
    const newMap = this.cloneMap();
    Object.entries(updates).forEach(([id, value]) => {
      const textResource = newMap.get(id);
      newMap.set(id, { ...textResource, id, value });
    });
    return new TextResourceUtils(newMap);
  }

  public setMultiple(textResources: TextResource[]): TextResourceUtils {
    const newMap = this.cloneMap();
    textResources.forEach((textResource) => {
      newMap.set(textResource.id, textResource);
    });
    return new TextResourceUtils(newMap);
  }

  public prependOrUpdateMultiple(textResources: TextResource[]): TextResourceUtils {
    const newResources = this.filterOutExisting(textResources);
    const newMap = this.prependMultiple(newResources);
    return newMap.setMultiple(textResources);
  }

  private filterOutExisting(textResources: TextResource[]): TextResource[] {
    return textResources.filter((textResource) => !this.textResources.has(textResource.id));
  }

  private prependMultiple(textResources: TextResource[]): TextResourceUtils {
    const existingResources: TextResource[] = this.asArray();
    return TextResourceUtils.fromArray([...textResources, ...existingResources]);
  }

  public delete(id: string): TextResourceUtils {
    const newMap = this.cloneMap();
    newMap.delete(id);
    return new TextResourceUtils(newMap);
  }

  private cloneMap(): TextResourceMap {
    return new Map(this.textResources);
  }
}

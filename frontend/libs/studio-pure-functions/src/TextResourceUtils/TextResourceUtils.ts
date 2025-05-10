import type { TextResource } from '../types/TextResource';
import type { TextResourceMap } from '../types/TextResourceMap';

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

  public set(textResource: TextResource): TextResourceUtils {
    const newMap = this.cloneMap();
    newMap.set(textResource.id, textResource);
    return new TextResourceUtils(newMap);
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

import { ArrayUtils } from '@studio/pure-functions';

type ListenerMap<EventMap extends Record<string, (...args: unknown[]) => void>> = Map<
  keyof EventMap,
  Array<EventMap[keyof EventMap]>
>;

export class EventListeners<EventMap extends Record<string, (...args: unknown[]) => void>> {
  private readonly list: ListenerMap<EventMap>;

  constructor() {
    this.list = new Map();
  }

  triggerEvent<Key extends keyof EventMap>(
    eventName: Key,
    ...params: Parameters<EventMap[Key]>
  ): void {
    if (this.has(eventName)) {
      const functions = this.get(eventName);
      functions.forEach((fun) => fun(...params));
    }
  }

  add<Key extends keyof EventMap>(eventName: Key, callback: EventMap[Key]): void {
    if (this.has(eventName)) this.addListenerToCurrentList<Key>(eventName, callback);
    else this.createNewListenerList<Key>(eventName, [callback]);
  }

  private addListenerToCurrentList<Key extends keyof EventMap>(
    eventName: Key,
    callback: EventMap[Key],
  ): void {
    const currentListeners = this.get<Key>(eventName);
    this.set<Key>(eventName, [...currentListeners, callback]);
  }

  private createNewListenerList<Key extends keyof EventMap>(
    eventName: Key,
    callbacks: EventMap[Key][],
  ): void {
    this.set<Key>(eventName, callbacks);
  }

  remove<Key extends keyof EventMap>(eventName: Key, callback: EventMap[Key]): void {
    if (!this.functionExists<Key>(eventName, callback))
      throw new Error(
        `The provided callback function does not exist on the ${String(eventName)} listener.`,
      );

    const currentList = this.get<Key>(eventName);
    const newList = ArrayUtils.removeItemByValue<EventMap[Key]>(currentList, callback);
    this.set<Key>(eventName, newList);
  }

  private functionExists<Key extends keyof EventMap>(
    eventName: Key,
    callback: EventMap[Key],
  ): boolean {
    return this.has(eventName) && this.get<Key>(eventName).includes(callback);
  }

  private has(eventName: keyof EventMap): boolean {
    return this.list.has(eventName);
  }

  private get<Key extends keyof EventMap>(eventName: Key): EventMap[Key][] | undefined {
    return this.list.get(eventName) as EventMap[Key][] | undefined;
  }

  private set<Key extends keyof EventMap>(eventName: Key, callbacks: EventMap[Key][]): void {
    this.list.set(eventName, callbacks);
  }

  clear(): void {
    this.list.clear();
  }
}

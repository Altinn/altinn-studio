import { ArrayUtils } from '@studio/pure-functions';

export class EventListeners {
  private list: Map<string, Function[]>;

  constructor() {
    this.list = new Map<string, Function[]>();
  }

  triggerEvent(eventName: string, ...params: any[]): void {
    if (this.has(eventName)) {
      const functions = this.get(eventName);
      functions.forEach((fun) => fun(...params));
    }
  }

  add(eventName: string, callback: Function): void {
    if (this.has(eventName)) this.addListenerToCurrentList(eventName, callback);
    else this.createNewListenerList(eventName, [callback]);
  }

  private addListenerToCurrentList(eventName: string, callback: Function): void {
    const currentListeners = this.get(eventName);
    this.set(eventName, [...currentListeners, callback]);
  }

  private createNewListenerList(eventName: string, callbacks: Function[]): void {
    this.set(eventName, callbacks);
  }

  remove(eventName: string, callback: Function): void {
    if (this.has(eventName)) {
      this.removeListener(eventName, callback);
    }
  }

  private removeListener(eventName: string, callback: Function): void {
    const currentList = this.get(eventName);
    const newList = ArrayUtils.removeItemByValue<Function>(currentList, callback);
    this.set(eventName, newList);
  }

  private has(eventName: string): boolean {
    return this.list.has(eventName);
  }

  private get(eventName: string): Function[] | undefined {
    return this.list.get(eventName);
  }

  private set(eventName: string, callbacks: Function[]): Map<string, Function[]> {
    return this.list.set(eventName, callbacks);
  }

  clear(): void {
    return this.list.clear();
  }
}

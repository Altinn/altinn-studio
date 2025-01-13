import { ArrayUtils } from '@studio/pure-functions';

export class EventListeners {
  static list: Map<string, Function[]> = new Map();

  static triggerEvent(eventName: string, ...params: any[]) {
    if (EventListeners.has(eventName)) {
      const functions = EventListeners.get(eventName);
      functions.forEach((fun) => fun(...params));
    }
  }

  static add(eventName: string, callback: Function): void {
    if (EventListeners.has(eventName)) EventListeners.addListenerToCurrentList(eventName, callback);
    else EventListeners.createNewListenerList(eventName, [callback]);
  }

  private static addListenerToCurrentList(eventName: string, callback: Function): void {
    const currentListeners = EventListeners.get(eventName);
    EventListeners.set(eventName, [...currentListeners, callback]);
  }

  private static createNewListenerList(eventName: string, callbacks: Function[]): void {
    EventListeners.set(eventName, callbacks);
  }

  static remove(eventName: string, callback: Function): void {
    if (EventListeners.has(eventName)) {
      EventListeners.removeListener(eventName, callback);
    }
  }

  private static removeListener(eventName: string, callback: Function): void {
    const currentList = EventListeners.get(eventName);
    const newList = ArrayUtils.removeItemByValue<Function>(currentList, callback);
    EventListeners.set(eventName, newList);
  }

  private static has(eventName: string): boolean {
    return EventListeners.list.has(eventName);
  }

  private static get(eventName: string): Function[] | undefined {
    return EventListeners.list.get(eventName);
  }

  private static set(eventName: string, callbacks: Function[]): Map<string, Function[]> {
    return EventListeners.list.set(eventName, callbacks);
  }

  static clear(): void {
    return EventListeners.list.clear();
  }
}

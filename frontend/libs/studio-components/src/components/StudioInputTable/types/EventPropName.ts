import type { EventName } from './EventName';

export type EventPropName<Event extends EventName = EventName> = `on${Capitalize<Event>}`;

import type { HTMLCellInputElement } from './HTMLCellInputElement';
import type { HTMLAttributes } from 'react';
import type { EventPropName } from './EventPropName';

export type EventProps<Element extends HTMLCellInputElement> = Pick<
  HTMLAttributes<Element>,
  EventPropName
>;

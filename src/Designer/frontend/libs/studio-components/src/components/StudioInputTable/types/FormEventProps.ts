import type { HTMLCellInputElement } from './HTMLCellInputElement';
import type { HTMLAttributes } from 'react';
import type { EventPropName } from './EventPropName';

export type FormEventProps<Element extends HTMLCellInputElement> = Pick<
  HTMLAttributes<Element>,
  EventPropName
>;

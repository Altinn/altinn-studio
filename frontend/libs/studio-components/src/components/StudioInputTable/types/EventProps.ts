import { HTMLCellInputElement } from './HTMLCellInputElement';
import { HTMLAttributes } from 'react';

export type EventProps<Element extends HTMLCellInputElement> = Pick<
  HTMLAttributes<Element>,
  'onBlur' | 'onFocus' | 'onChange'
>;

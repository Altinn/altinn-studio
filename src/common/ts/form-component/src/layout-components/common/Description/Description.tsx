import type { HTMLAttributes, ReactNode } from 'react';

import { getDescriptionId } from '@app/form-component/layout-components/utils/labelIds';
import cn from 'classnames';

import classes from './Description.module.css';

export type DescriptionProps = {
  description: ReactNode;
  componentId?: string;
} & HTMLAttributes<HTMLSpanElement>;

export function Description({ description, className, componentId, ...rest }: DescriptionProps) {
  if (!description) {
    return null;
  }

  return (
    <span
      {...rest}
      className={cn(classes.description, className)}
      id={getDescriptionId(componentId)}
      data-testid={getDescriptionId(componentId)}
    >
      {description}
    </span>
  );
}

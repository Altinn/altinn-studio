import React from 'react';
import type { HTMLAttributes } from 'react';

import cn from 'classnames';

import classes from 'src/components/form/Description.module.css';
import { getDescriptionId } from 'src/components/label/Label';

export type DescriptionProps = {
  description: React.ReactNode;
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

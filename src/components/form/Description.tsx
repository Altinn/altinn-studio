import React from 'react';
import type { HTMLAttributes } from 'react';

import cn from 'classnames';

import classes from 'src/components/form/Description.module.css';

export type DescriptionProps = {
  description: React.ReactNode | string | undefined;
  id?: string;
} & HTMLAttributes<HTMLSpanElement>;

export function Description({ description, className, id, ...rest }: DescriptionProps) {
  if (!description) {
    return null;
  }

  return (
    <span
      {...rest}
      className={cn(classes.description, className)}
      id={`description-${id}`}
      data-testid={`description-${id}`}
    >
      {description}
    </span>
  );
}

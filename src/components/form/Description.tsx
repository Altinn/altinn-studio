import React from 'react';
import type { HTMLAttributes } from 'react';

import cn from 'classnames';

import classes from 'src/components/form/Description.module.css';
import { getDescriptionId } from 'src/components/label/Label';
import { Lang } from 'src/features/language/Lang';

export type DescriptionProps = {
  description: React.ReactNode | string | undefined;
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
      {typeof description === 'string' ? <Lang id={description} /> : description}
    </span>
  );
}

import React from 'react';

import classes from 'src/components/form/Description.module.css';
export interface IDescriptionProps {
  description: React.ReactNode;
  id: string;
}

export function Description(props: IDescriptionProps) {
  if (!props.description) {
    return null;
  }
  return (
    <span
      className={classes.description}
      id={`description-${props.id}`}
      data-testid={`description-${props.id}`}
    >
      {props.description}
    </span>
  );
}

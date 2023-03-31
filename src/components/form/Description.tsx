import React from 'react';

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
      className='a-form-label description-label'
      id={`description-${props.id}`}
      data-testid={`description-${props.id}`}
    >
      {props.description}
    </span>
  );
}

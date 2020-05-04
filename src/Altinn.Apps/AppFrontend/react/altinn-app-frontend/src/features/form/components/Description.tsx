import * as React from 'react';

export default function Description({description}){
  if (!description) {
    return null;
  }
  return <span className='a-form-label description-label'>{description}</span>;
}
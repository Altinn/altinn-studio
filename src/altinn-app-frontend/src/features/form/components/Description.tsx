import * as React from 'react';

export default function Description({descriptionTextKey}){
  if (!descriptionTextKey) {
    return null;
  }

  const description: string = this.getTextResource(descriptionTextKey);
  return <span className='a-form-label description-label'>{description}</span>;
}
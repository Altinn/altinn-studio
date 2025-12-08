import React from 'react';

import { ImageComponentNext } from 'src/layout/Image/ImageComponent.next';
import { ParagraphComponentNext } from 'src/layout/Paragraph/ParagraphComponent.next';
import type { CompExternal } from 'src/layout/layout';

interface RenderComponentProps {
  component: CompExternal;
}

export const RenderComponent: React.FunctionComponent<RenderComponentProps> = ({ component }) => {
  console.log('dings');

  console.log('component', component.textResourceBindings);

  // const text = component.textResourceBindings
  //   ? textResourceBindings?.resources[component.textResourceBindings]
  //   : component.textResourceBindings;

  if (component.type === 'Paragraph') {
    return <ParagraphComponentNext {...component} />;
  }

  if (component.type === 'Image') {
    return <ImageComponentNext {...component} />;
  }

  return <pre>{JSON.stringify(component, null, 2)}</pre>;
};

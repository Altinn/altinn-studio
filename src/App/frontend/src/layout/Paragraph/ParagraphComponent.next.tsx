import React from 'react';

import { useTextResources } from 'src/http-client/api-client/queries/textResources';
import type { CompParagraphExternal } from 'src/layout/Paragraph/config.generated';

export function applyTemplate(template: any): string {
  if (!template?.variables) {
    return template?.value ?? '';
  }

  let output = template.value;

  const vars = template.variables ?? [];

  for (let i = 0; i < vars.length; i++) {
    const val = vars[i]?.value ?? '';
    const placeholder = new RegExp(`\\{${i}\\}`, 'g');
    output = output.replace(placeholder, val);
  }

  // If there are placeholders with no matching variable, remove them
  output = output.replace(/\{\d+\}/g, '');

  return output;
}

export function ParagraphComponentNext(props: CompParagraphExternal) {
  console.log('props', props);

  const lang = window.AltinnAppGlobalData.userProfile.profileSettingPreference.language;

  const textResourceBindings = useTextResources({ language: lang ?? 'nb' });
  console.log('textResourceBindings', textResourceBindings);
  // const text = props.textResourceBindings.;
  const title = props.textResourceBindings?.title
    ? textResourceBindings?.resources.find((resource) => resource.id === props.textResourceBindings?.title)
    : props.textResourceBindings?.title;
  console.log('title', title);

  console.log('applyTemplate(textResourceBindings)', applyTemplate(textResourceBindings));

  return <h1>{title ? applyTemplate(title) : ''}</h1>;
}

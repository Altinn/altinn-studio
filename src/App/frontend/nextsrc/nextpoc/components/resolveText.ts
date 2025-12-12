import type { TextResource } from 'nextsrc/nextpoc/app/api';

import type { CompExternal } from 'src/layout/layout';

export function resolveText(component: CompExternal, textResource?: TextResource): string | undefined {
  // if (component.type !== 'Paragraph') {
  //   return null;
  // }
  if (!textResource?.resources) {
    return undefined;
  }
  // @ts-ignore
  if (!component.textResourceBindings?.title) {
    return undefined;
  }

  // @ts-ignore
  const foundText = textResource.resources.find((r) => r.id === component.textResourceBindings!.title);
  if (!foundText) {
    return undefined;
  }

  return foundText.value || undefined;
}

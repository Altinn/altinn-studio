import type { CompExternal } from 'src/layout/layout';

export function fileUploadHasTag(component: CompExternal<'FileUpload'>) {
  return Boolean(component.options || component.optionsId || component.source);
}

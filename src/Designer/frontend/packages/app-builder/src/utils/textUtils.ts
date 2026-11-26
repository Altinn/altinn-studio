import type { ITextResources } from 'app-shared/types/global';
import type { TextsById } from '../types';

export function getTextsById(
  textResources: ITextResources | undefined,
  language: string,
): TextsById {
  const resources = textResources?.[language] ?? [];
  return Object.fromEntries(resources.map((resource) => [resource.id, resource.value]));
}

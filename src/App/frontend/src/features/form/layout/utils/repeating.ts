import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompExternal, CompTypes, IDataModelBindings } from 'src/layout/layout';

const repeatingComponents = ['RepeatingGroup', 'Likert'] as const satisfies CompTypes[];
export type RepeatingComponents = (typeof repeatingComponents)[number];

export function isRepeatingComponent(component: unknown): component is CompExternal<RepeatingComponents> {
  return (
    !!component &&
    typeof component === 'object' &&
    'type' in component &&
    typeof component.type === 'string' &&
    repeatingComponents.includes(component.type as RepeatingComponents)
  );
}

export function isRepeatingComponentType(type: string): type is RepeatingComponents {
  return repeatingComponents.includes(type as RepeatingComponents);
}

export function getRepeatingBinding<T extends RepeatingComponents>(
  type: T,
  bindings: IDataModelBindings<T> | undefined,
): IDataModelReference | undefined {
  if (!bindings) {
    return undefined;
  }

  switch (type) {
    case 'RepeatingGroup':
      return (bindings as IDataModelBindings<'RepeatingGroup'>)?.group;
    case 'Likert':
      return (bindings as IDataModelBindings<'Likert'>)?.questions;
    default:
      throw new Error(`Unexpected repeating component type`);
  }
}

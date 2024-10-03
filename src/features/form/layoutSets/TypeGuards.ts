import type { ILayoutSet, ILayoutSetDefault, ILayoutSetSubform } from 'src/layout/common.generated';

export function layoutSetIsSubform(layoutSet: ILayoutSet): layoutSet is ILayoutSetSubform {
  return 'type' in layoutSet && layoutSet.type === 'subform';
}

export function layoutSetIsDefault(layoutSet: ILayoutSet): layoutSet is ILayoutSetDefault {
  return 'tasks' in layoutSet || !layoutSetIsSubform(layoutSet);
}

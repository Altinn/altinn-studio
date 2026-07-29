import { getRepeatingBinding, isRepeatingComponent } from 'src/features/form/layout/utils/repeating';
import { splitDashedKey } from 'src/utils/splitDashedKey';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { RepeatingComponents } from 'src/features/form/layout/utils/repeating';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompExternal } from 'src/layout/layout';

export function getLayoutDepth(baseComponentId: string, lookups: LayoutLookups): number {
  let depth = 1;
  let parent = lookups.componentToParent[baseComponentId];
  while (parent?.type === 'node') {
    depth++;
    parent = lookups.componentToParent[parent.id];
  }
  return depth;
}

export function getDataModelLocationForIndexedNode(
  indexedId: string | undefined,
  lookups: LayoutLookups,
): { groupBinding: IDataModelReference | undefined; rowIndex: number | undefined } {
  if (!indexedId) {
    return { groupBinding: undefined, rowIndex: undefined };
  }

  const { baseComponentId, depth } = splitDashedKey(indexedId);
  const repeatingParents: CompExternal<RepeatingComponents>[] = [];
  let parent = lookups.componentToParent[baseComponentId];
  while (parent?.type === 'node') {
    const component = lookups.allComponents[parent.id];
    if (isRepeatingComponent(component)) {
      repeatingParents.unshift(component);
    }
    parent = lookups.componentToParent[parent.id];
  }

  const nearestRepeatingParent = repeatingParents.at(-1);
  const groupBinding =
    nearestRepeatingParent &&
    getRepeatingBinding(nearestRepeatingParent.type, nearestRepeatingParent.dataModelBindings);
  if (!groupBinding) {
    return { groupBinding: undefined, rowIndex: undefined };
  }

  const indexedGroupBinding = { ...groupBinding };
  for (let index = repeatingParents.length - 2; index >= 0; index--) {
    const outerParent = repeatingParents[index];
    const outerBinding = getRepeatingBinding(outerParent.type, outerParent.dataModelBindings);
    const rowIndex = depth[index];
    if (outerBinding && rowIndex !== undefined) {
      indexedGroupBinding.field = indexedGroupBinding.field.replace(
        outerBinding.field,
        `${outerBinding.field}[${rowIndex}]`,
      );
    }
  }

  return { groupBinding: indexedGroupBinding, rowIndex: depth[repeatingParents.length - 1] };
}

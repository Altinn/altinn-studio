import { useCallback } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { transposeDataBinding } from 'src/utils/databindings/DataBinding';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LaxNodeDataSelector } from 'src/utils/layout/NodesContext';

export type DataModelTransposeSelector = ReturnType<typeof useDataModelBindingTranspose>;

/**
 * This takes a dataModel path (without indexes) and alters it to add indexes such that the data model path refers
 * to an item in the same repeating group row (or nested repeating group row) as the data model for the current
 * component.
 *
 * Example: Let's say this component is in the second row of the first repeating group, and inside the third row
 * of a nested repeating group. Our data model binding is such:
 *    simpleBinding: 'MyModel.Group[1].NestedGroup[2].FirstName'
 *
 * If you pass the argument 'MyModel.Group.NestedGroup.Age' to this function, you'll get the
 * transposed binding back: 'MyModel.Group[1].NestedGroup[2].Age'.
 *
 * If you pass the argument 'MyModel.Group[2].NestedGroup[3].Age' to this function, it will still be transposed to
 * the current row indexes: 'MyModel.Group[1].NestedGroup[2].Age' unless you pass overwriteOtherIndices = false.
 */
export function useDataModelBindingTranspose() {
  const nodeSelector = NodesInternal.useLaxNodeDataSelector();

  return useCallback(
    (node: LayoutNode, subject: IDataModelReference, _rowIndex?: number) => {
      const { currentLocation, currentLocationIsRepGroup, foundRowIndex } = firstDataModelBinding(node, nodeSelector);
      const rowIndex = _rowIndex ?? foundRowIndex;
      return currentLocation
        ? transposeDataBinding({ subject, currentLocation, rowIndex, currentLocationIsRepGroup })
        : subject;
    },
    [nodeSelector],
  );
}

/**
 * Finds the first component with a data model binding (and the first binding) in the current component's hierarchy.
 * Starts at a node and then moves up the hierarchy until it finds a node with a data model binding.
 */
function firstDataModelBinding(
  node: LayoutNode,
  nodeSelector: LaxNodeDataSelector,
  rowIndex?: number,
): {
  currentLocation: IDataModelReference | undefined;
  currentLocationIsRepGroup: boolean;
  foundRowIndex: number | undefined;
} {
  const dataModelBindings = nodeSelector((picker) => picker(node)?.layout.dataModelBindings, [node]);
  if (dataModelBindings === ContextNotProvided) {
    return {
      currentLocation: undefined,
      foundRowIndex: undefined,
      currentLocationIsRepGroup: false,
    };
  }

  const firstBinding = Object.keys(dataModelBindings || {}).shift();
  if (firstBinding && dataModelBindings) {
    return {
      currentLocation: dataModelBindings[firstBinding],
      foundRowIndex: rowIndex,
      currentLocationIsRepGroup: node.isType('RepeatingGroup'),
    };
  }

  const parent = node.parent;
  if (!parent || !(parent instanceof BaseLayoutNode)) {
    return {
      currentLocation: undefined,
      currentLocationIsRepGroup: false,
      foundRowIndex: undefined,
    };
  }
  return firstDataModelBinding(parent, nodeSelector, node.rowIndex);
}

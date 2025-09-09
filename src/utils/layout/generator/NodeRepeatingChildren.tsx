import React, { Fragment, useMemo } from 'react';

import dot from 'dot-object';

import { FD } from 'src/features/formData/FormDataWrite';
import { DataModelLocationProvider } from 'src/utils/layout/DataModelLocation';
import { GeneratorInternal, GeneratorRowProvider } from 'src/utils/layout/generator/GeneratorContext';
import { WhenParentAdded } from 'src/utils/layout/generator/GeneratorStages';
import { GenerateNodeChildren } from 'src/utils/layout/generator/LayoutSetGenerator';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { ChildClaims, ChildIdMutator, ChildMutator } from 'src/utils/layout/generator/GeneratorContext';

interface Props {
  claims: ChildClaims | undefined;
}

export function NodeRepeatingChildren(props: Props) {
  return (
    <WhenParentAdded>
      <NodeRepeatingChildrenWorker {...props} />
    </WhenParentAdded>
  );
}

const emptySet: ChildClaims = new Set();
function NodeRepeatingChildrenWorker({ claims }: Props) {
  const binding = 'group'; // Hardcoded for RepeatingGroup
  const multiPageSupport = 'edit.multiPage'; // Hardcoded for RepeatingGroup
  const item = GeneratorInternal.useIntermediateItem();
  const groupBinding = item?.dataModelBindings?.[binding];
  const numRows = FD.useFreshNumRows(groupBinding);
  const multiPage = multiPageSupport && dot.pick(multiPageSupport, item) === true;
  const multiPageMapping = useMemo(
    () => (multiPage ? makeMultiPageMapping(item?.['children']) : undefined),
    [item, multiPage],
  );

  return (
    <>
      {Array.from({ length: numRows }).map((_, index) => (
        <Fragment key={index}>
          {/* Do not remove this space.
              React's `getHostSibling` function can be very slow for renderless components,
              this will make sure it finds the sibling immediately by adding a `HostText` fiber-node directly below.
              The space will be added to the DOM, but should not be visible.
              See https://github.com/facebook/react/blob/ed15d5007ca7ee4d61294c741ce3e858d3c1d461/packages/react-reconciler/src/ReactFiberCommitHostEffects.js#L222-L226
          */}{' '}
          <GenerateRow
            rowIndex={index}
            groupBinding={groupBinding}
            claims={claims ?? emptySet}
            multiPageMapping={multiPageMapping}
          />
        </Fragment>
      ))}
    </>
  );
}

interface GenerateRowProps {
  rowIndex: number;
  claims: ChildClaims;
  groupBinding: IDataModelReference;
  multiPageMapping: MultiPageMapping | undefined;
}

const GenerateRow = React.memo((props: GenerateRowProps) => (
  <DataModelLocationProvider
    groupBinding={props.groupBinding}
    rowIndex={props.rowIndex}
  >
    <GenerateRowInner {...props} />
  </DataModelLocationProvider>
));
GenerateRow.displayName = 'GenerateRow';

function GenerateRowInner({ rowIndex, claims, groupBinding, multiPageMapping }: GenerateRowProps) {
  const depth = GeneratorInternal.useDepth();
  const recursiveMutators = useMemo(
    () => [
      mutateComponentId(rowIndex),
      mutateDataModelBindings(rowIndex, groupBinding),
      mutateMapping(rowIndex, depth),
    ],
    [rowIndex, depth, groupBinding],
  );

  return (
    <GeneratorRowProvider
      rowIndex={rowIndex}
      multiPageMapping={multiPageMapping}
      groupBinding={groupBinding}
      idMutators={[mutateComponentIdPlain(rowIndex)]}
      recursiveMutators={recursiveMutators}
    >
      <GenerateNodeChildren claims={claims} />
    </GeneratorRowProvider>
  );
}

export interface MultiPageMapping {
  [childId: string]: number;
}

function makeMultiPageMapping(children: string[] | undefined): MultiPageMapping {
  const mapping: MultiPageMapping = {};
  for (const child of children ?? []) {
    const [pageIndex, childId] = child.split(':', 2);
    mapping[childId] = parseInt(pageIndex, 10);
  }
  return mapping;
}

export function mutateComponentIdPlain(rowIndex: number): ChildIdMutator {
  return (id) => `${id}-${rowIndex}`;
}

export function mutateComponentId(rowIndex: number): ChildMutator {
  return (item) => {
    item.id += `-${rowIndex}`;
  };
}

export function mutateDataModelBindings(rowIndex: number, groupBinding: IDataModelReference | undefined): ChildMutator {
  return (item) => {
    const bindings = item.dataModelBindings || {};
    for (const key of Object.keys(bindings)) {
      const binding = bindings[key] as IDataModelReference | undefined;
      if (!binding || !groupBinding || groupBinding.dataType !== binding.dataType) {
        continue;
      }
      bindings[key] = {
        dataType: binding.dataType,
        field: binding.field.replace(groupBinding.field, `${groupBinding.field}[${rowIndex}]`),
      };
    }
  };
}

export function mutateMapping(rowIndex: number, depth: number): ChildMutator {
  return (item) => {
    if ('mapping' in item && item.mapping) {
      // Pages start at 1, top-level nodes at 2, so for nodes inside repeating groups to start at 0 we subtract 2.
      const depthMarker = depth - 2;
      for (const key of Object.keys(item.mapping)) {
        const value = item.mapping[key];
        const newKey = key.replace(`[{${depthMarker}}]`, `[${rowIndex}]`);
        delete item.mapping[key];
        item.mapping[newKey] = value;
      }
    }
  };
}

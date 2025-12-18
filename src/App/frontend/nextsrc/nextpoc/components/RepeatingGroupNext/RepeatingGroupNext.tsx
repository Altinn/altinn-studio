import React, { useRef } from 'react';

import { Button, Table } from '@digdir/designsystemet-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import dot from 'dot-object';
import { RenderLayoutRow } from 'nextsrc/nextpoc/components/RenderLayout';
import { useNoMemo } from 'nextsrc/nextpoc/components/resolveText';
import { layoutStore } from 'nextsrc/nextpoc/stores/layoutStore';
import { useStore } from 'zustand';
import type { ResolvedCompExternal } from 'nextsrc/nextpoc/stores/layoutStore';

import type { Expression } from 'src/features/expressions/types';
import type { CompIntermediateExact } from 'src/layout/layout';
interface RepeatingGroupNextType {
  component: ResolvedCompExternal;
  parentBinding?: string;
  itemIndex?: number;
}

export const RepeatingGroupNext: React.FC<RepeatingGroupNextType> = ({ component, parentBinding, itemIndex }) => {
  // @ts-ignore
  const binding = component.dataModelBindings?.group;
  if (!binding) {
    throw new Error('Tried to render repeating group without datamodel binding');
  }

  const splittedBinding = binding.split('.');

  const actualBinding =
    parentBinding !== undefined
      ? `${parentBinding}[${itemIndex}].${splittedBinding[splittedBinding.length - 1] || ''}`
      : binding;

  const groupArray = useStore(layoutStore, (state) => dot.pick(actualBinding, state.data)) || [];

  const addRow = useStore(layoutStore, (state) => state.addRow);

  const scrollElementRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: groupArray.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 110,
    overscan: 5,
  });

  const virtualItems = useNoMemo(() => virtualizer.getVirtualItems());
  const hiddenRow = (component as unknown as CompIntermediateExact<'RepeatingGroup'>)
    .hiddenRow as unknown as Expression;

  if (!component.children || !Array.isArray(component.children)) {
    return null;
  }

  if (groupArray.length < 1) {
    return (
      <Button
        onClick={() => {
          addRow(binding, parentBinding, itemIndex);
        }}
      >
        Legg til rad
      </Button>
    );
  }
  // console.log('groupArray', groupArray);
  if (groupArray.length < 500) {
    return (
      <div>
        <h1>actualBinding {actualBinding}</h1>
        <Table>
          <Table.Head id={`group-${component.id}-table-header`}>
            <Table.Row>
              {component.children.map((child) => (
                <Table.HeaderCell key={child.id}>{child.id}</Table.HeaderCell>
              ))}
            </Table.Row>
          </Table.Head>

          <Table.Body id={`group-${component.id}-table-body`}>
            {groupArray.map((_, index) => (
              <RenderLayoutRow
                key={index}
                components={component.children}
                parentBinding={actualBinding}
                itemIndex={index}
                isRowHiddenExpression={hiddenRow}
              />
            ))}
          </Table.Body>
        </Table>

        <Button
          onClick={() => {
            addRow(binding, parentBinding, itemIndex);
          }}
        >
          Legg til rad
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={scrollElementRef}
      style={{
        width: '100%',
        height: '500px',
        overflow: 'auto',
      }}
    >
      <Table>
        <Table.Head id={`group-${component.id}-table-header`}>
          <Table.Row>
            <Table.HeaderCell>#</Table.HeaderCell>
            {component.children.map((child) => (
              <Table.HeaderCell key={child.id}>{child.id}</Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Head>

        <Table.Body
          id={`group-${component.id}-table-body`}
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {virtualItems.map((row) => (
            <RenderLayoutRow
              key={row.index}
              components={component.children}
              parentBinding={actualBinding}
              itemIndex={row.index}
              isRowHiddenExpression={hiddenRow}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: `${row.size}px`,
                transform: `translateY(${row.start}px)`,
              }}
            />
          ))}
        </Table.Body>
      </Table>
    </div>
  );

  // return <ul>{rowVirtualizer.getVirtualItems().map((virtualRow, index) => {
  //   return <li>{index}</li>)</ul>

  // return (
  //   <div
  //     ref={scrollElementRef}
  //     style={{
  //       width: '100%',
  //       height: '500px',
  //       overflow: 'auto',
  //       border: '10px solid yellow',
  //     }}
  //   >
  //     <div
  //       style={{
  //         height: `${virtualizer.getTotalSize()}px`,
  //         position: 'relative',
  //         width: '100%',
  //       }}
  //     >
  //       {virtualItems.map((virtualRow, index) => {
  //         // const index = virtualRow.index;
  //         // console.log('virtualRow', virtualRow);
  //         const rangeTest = range(virtualRow.start, virtualRow.end);
  //         // console.log('rangeTest', rangeTest);
  //         return (
  //           <ul
  //             key={`${component.id}-${index}`}
  //             ref={(el) => {
  //               if (el) {
  //                 virtualizer.measureElement(el);
  //               }
  //             }}
  //             data-index={index}
  //             style={{
  //               position: 'absolute',
  //               top: 0,
  //               left: 0,
  //               width: '100%',
  //               height: `${virtualRow.size}px`,
  //               transform: `translateY(${virtualRow.start}px)`,
  //               border: '10px solid purple',
  //             }}
  //           >
  //             {index}
  //             {/*<RenderLayout*/}
  //             {/*  key={`${component.id}-${index}`}*/}
  //             {/*  components={component.children}*/}
  //             {/*  parentBinding={binding}*/}
  //             {/*  itemIndex={index}*/}
  //             {/*/>*/}
  //
  //             {/*{range(virtualRow.start, virtualRow.end).map((curr) => (*/}
  //             {/*  // // console.log('curr', curr);*/}
  //             {/*  // const row = groupArray[curr];*/}
  //             {/*  // // console.log('row, row');*/}
  //             {/*  // return <li key={`${component.id}-${curr}-${index}`}>{`${component.id}-${curr}-${index}`}</li>;*/}
  //
  //             {/*  <RenderLayout*/}
  //             {/*    key={curr}*/}
  //             {/*    components={component.children}*/}
  //             {/*    parentBinding={binding}*/}
  //             {/*    itemIndex={index}*/}
  //             {/*  />*/}
  //             {/*))}*/}
  //           </ul>
  //         );
  //       })}
  //     </div>
  //
  //     <Button
  //       onClick={() => {
  //         addRow(binding, parentBinding, itemIndex);
  //       }}
  //     >
  //       Til rad
  //     </Button>
  //   </div>
  // );
};

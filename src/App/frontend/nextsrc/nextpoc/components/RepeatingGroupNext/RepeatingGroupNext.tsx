import React, { useRef } from 'react';

import { Button, Table } from '@digdir/designsystemet-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import dot from 'dot-object';
import { RenderLayout, RenderLayoutRow } from 'nextsrc/nextpoc/components/RenderLayout';
import classes from 'nextsrc/nextpoc/components/RepeatingGroupNext/RepeatingGroupNext.module.css';
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

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: groupArray.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 9000, // just a rough estimate
    overscan: 2,
    measureElement: (element, _, __) => element.getBoundingClientRect().height,
  });

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

  if (groupArray.length < 500) {
    return (
      <div style={{ border: '1px solid green' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div
        ref={parentRef}
        className={classes.container}
        style={{
          width: '100%',
          height: '500px',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
            width: '100%',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const index = virtualRow.index;
            return (
              <div
                key={index}
                ref={(el) => {
                  if (el) {
                    rowVirtualizer.measureElement(el);
                  }
                }}
                data-index={index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${groupArray[virtualRow.index]}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <RenderLayout
                  components={component.children}
                  parentBinding={binding}
                  itemIndex={index}
                />
              </div>
            );
          })}
        </div>
      </div>
      <Button
        onClick={() => {
          addRow(binding, parentBinding, itemIndex);
        }}
      >
        Til rad
      </Button>
    </div>
  );
};

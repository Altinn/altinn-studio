/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useEffect, useRef } from 'react';

import { EyeSlashIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import classes from 'src/features/devtools/components/LayoutInspector/LayoutInspector.module.css';
import { useComponentHighlighter } from 'src/features/devtools/hooks/useComponentHighlighter';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { baseIdsFromGridRow } from 'src/layout/Grid/tools';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { DataModelLocationProvider, useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useExternalItem } from 'src/utils/layout/hooks';
import { Hidden } from 'src/utils/layout/NodesContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { GridRows } from 'src/layout/common.generated';

interface Common {
  selected: string | undefined;
  onClick: (id: string) => void;
}

interface INodeHierarchyItemProps extends Common {
  baseId: string;
}

interface INodeHierarchyProps extends Common {
  baseIds: string[];
}

interface IGridRowsRenderer extends Common {
  rows: GridRows;
  text: string;
}

const GridRowList = ({ rows, onClick, text, selected }: IGridRowsRenderer) => (
  <>
    {rows.map((row, idx) => {
      const baseIds = baseIdsFromGridRow(row);
      return (
        <li
          className={classes.repGroupRow}
          key={idx}
        >
          <span className={classes.componentMetadata}>{text}</span>
          {baseIds.length > 0 ? (
            <NodeHierarchy
              baseIds={baseIds}
              selected={selected}
              onClick={onClick}
            />
          ) : (
            <li className={cn(classes.componentMetadata, classes.list)}>Ingen komponenter å vise her</li>
          )}
        </li>
      );
    })}
  </>
);

const NodeHierarchyItem = ({ baseId, onClick, selected }: INodeHierarchyItemProps) => {
  const component = useExternalItem(baseId);
  const nodeId = useIndexedId(baseId);
  const { onMouseEnter, onMouseLeave } = useComponentHighlighter(nodeId, false);
  const layoutLookups = useLayoutLookups();
  const children = layoutLookups.componentToChildren[baseId] ?? [];
  const hasChildren = children.length > 0;
  const isHidden = Hidden.useIsHidden(nodeId, 'node', { respectDevTools: false });

  const el = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (nodeId === selected && el.current) {
      el.current.scrollIntoView({ block: 'nearest' });
    }
  }, [nodeId, selected]);

  return (
    <>
      <li
        ref={el}
        className={cn({
          [classes.item]: true,
          [classes.active]: nodeId === selected,
        })}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={() => onClick(nodeId)}
      >
        <span className={classes.componentType}>{component.type}</span>
        <span className={classes.componentId}>{nodeId}</span>
        {isHidden && (
          <span className={classes.listIcon}>
            <EyeSlashIcon title='Denne komponenten er skjult' />
          </span>
        )}
      </li>
      {/*Support for generic components with children */}
      {hasChildren && component.type !== 'RepeatingGroup' && (
        <li>
          <NodeHierarchy
            baseIds={children.map((id) => id)}
            selected={selected}
            onClick={onClick}
          />
        </li>
      )}
      {component.type === 'RepeatingGroup' && (
        <RepeatingGroupExtensions
          baseId={baseId}
          selected={selected}
          onClick={onClick}
        />
      )}
    </>
  );
};

function RepeatingGroupExtensions({ baseId, selected, onClick }: INodeHierarchyItemProps) {
  const nodeItem = useItemWhenType(baseId, 'RepeatingGroup');
  const rows = RepGroupHooks.useAllRowsWithHidden(baseId);
  const childIds = RepGroupHooks.useChildIds(baseId);

  return (
    <>
      {nodeItem.rowsBefore && (
        <GridRowList
          rows={nodeItem.rowsBefore}
          text='rowsBefore'
          selected={selected}
          onClick={onClick}
        />
      )}
      {rows.map((row) => (
        <li
          className={classes.repGroupRow}
          key={row?.index}
        >
          <span className={classes.componentMetadata}>
            Rad {row?.index} {row.hidden ? '(skjult)' : ''}
          </span>
          <DataModelLocationProvider
            groupBinding={nodeItem.dataModelBindings.group}
            rowIndex={row.index}
          >
            <NodeHierarchy
              baseIds={childIds}
              selected={selected}
              onClick={onClick}
            />
          </DataModelLocationProvider>
        </li>
      ))}
      {nodeItem.rowsAfter && (
        <GridRowList
          rows={nodeItem.rowsAfter}
          text='rowsAfter'
          selected={selected}
          onClick={onClick}
        />
      )}
    </>
  );
}

export function NodeHierarchy({ baseIds, ...rest }: INodeHierarchyProps) {
  return (
    <ul className={classes.list}>
      {baseIds.map((childId) => {
        if (!childId) {
          return null;
        }

        return (
          <NodeHierarchyItem
            key={childId}
            baseId={childId}
            {...rest}
          />
        );
      })}
    </ul>
  );
}

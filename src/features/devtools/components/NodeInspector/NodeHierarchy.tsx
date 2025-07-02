/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useEffect, useRef } from 'react';

import { EyeSlashIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import classes from 'src/features/devtools/components/LayoutInspector/LayoutInspector.module.css';
import { useComponentHighlighter } from 'src/features/devtools/hooks/useComponentHighlighter';
import { nodeIdsFromGridRow } from 'src/layout/Grid/tools';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { DataModelLocationProvider, useComponentIdMutator } from 'src/utils/layout/DataModelLocation';
import { Hidden, useNode } from 'src/utils/layout/NodesContext';
import { useItemWhenType, useNodeDirectChildren } from 'src/utils/layout/useNodeItem';
import type { GridRows } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface Common {
  selected: string | undefined;
  onClick: (id: string) => void;
}

interface INodeHierarchyItemProps extends Common {
  nodeId: string;
}

interface INodeHierarchyProps extends Common {
  nodeIds: string[];
}

interface IGridRowsRenderer extends Common {
  rows: GridRows;
  text: string;
}

const GridRowList = ({ rows, onClick, text, selected }: IGridRowsRenderer) => {
  const idMutator = useComponentIdMutator();
  return (
    <>
      {rows.map((row, idx) => {
        const nodeIds = nodeIdsFromGridRow(row, idMutator);
        return (
          <li
            className={classes.repGroupRow}
            key={idx}
          >
            <span className={classes.componentMetadata}>{text}</span>
            {nodeIds.length > 0 ? (
              <NodeHierarchy
                nodeIds={nodeIds}
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
};

const NodeHierarchyItem = ({ nodeId, onClick, selected }: INodeHierarchyItemProps) => {
  const node = useNode(nodeId);
  const nodeType = node?.type;
  const nodeMultiPageIndex = node?.multiPageIndex;
  const { onMouseEnter, onMouseLeave } = useComponentHighlighter(nodeId, false);
  const children = useNodeDirectChildren(node);
  const hasChildren = children.length > 0;
  const isHidden = Hidden.useIsHidden(node, { respectDevTools: false });

  const el = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (node?.id === selected && el.current) {
      el.current.scrollIntoView({ block: 'nearest' });
    }
  }, [node, selected]);

  if (!node) {
    return null;
  }

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
        <span className={classes.componentType}>{nodeType}</span>
        <span className={classes.componentId}>
          {nodeMultiPageIndex !== undefined ? `${nodeMultiPageIndex}:` : ''}
          {nodeId}
        </span>
        {isHidden && (
          <span className={classes.listIcon}>
            <EyeSlashIcon title='Denne komponenten er skjult' />
          </span>
        )}
      </li>
      {/* Support for generic components with children */}
      {hasChildren && !node.isType('RepeatingGroup') && (
        <li>
          <NodeHierarchy
            nodeIds={children.map((child) => child.id)}
            selected={selected}
            onClick={onClick}
          />
        </li>
      )}
      {node.isType('RepeatingGroup') && (
        <RepeatingGroupExtensions
          nodeId={nodeId}
          selected={selected}
          onClick={onClick}
        />
      )}
    </>
  );
};

function RepeatingGroupExtensions({ nodeId, selected, onClick }: INodeHierarchyItemProps) {
  const node = useNode(nodeId) as LayoutNode<'RepeatingGroup'>;
  const nodeItem = useItemWhenType(node.baseId, 'RepeatingGroup');
  const rows = RepGroupHooks.useAllRowsWithHidden(node.baseId);
  const childIds = RepGroupHooks.useChildIds(node.baseId);

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
              nodeIds={childIds.map((childId) => `${childId}-${row.index}`)}
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

export function NodeHierarchy({ nodeIds, ...rest }: INodeHierarchyProps) {
  return (
    <ul className={classes.list}>
      {nodeIds.map((childId) => {
        if (!childId) {
          return null;
        }

        return (
          <NodeHierarchyItem
            key={childId}
            nodeId={childId}
            {...rest}
          />
        );
      })}
    </ul>
  );
}

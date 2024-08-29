/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useEffect, useRef } from 'react';

import { EyeSlashIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import classes from 'src/features/devtools/components/LayoutInspector/LayoutInspector.module.css';
import { useComponentHighlighter } from 'src/features/devtools/hooks/useComponentHighlighter';
import { nodesFromGridRow } from 'src/layout/Grid/tools';
import { Hidden } from 'src/utils/layout/NodesContext';
import { useNodeDirectChildren, useNodeItem } from 'src/utils/layout/useNodeItem';
import type { GridRowsInternal } from 'src/layout/Grid/types';
import type { CompInternal } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface Common {
  selected: string | undefined;
  onClick: (id: string) => void;
}

interface INodeHierarchyItemProps extends Common {
  node: LayoutNode;
}

interface INodeHierarchyProps extends Common {
  nodes: LayoutNode[] | undefined;
}

interface IGridRowsRenderer extends Common {
  rows: GridRowsInternal;
  text: string;
}

const GridRowList = ({ rows, onClick, text, selected }: IGridRowsRenderer) => (
  <>
    {rows.map((row, idx) => {
      const nodes = nodesFromGridRow(row);
      return (
        <li
          className={classes.repGroupRow}
          key={idx}
        >
          <span className={classes.componentMetadata}>{text}</span>
          {nodes.length > 0 ? (
            <NodeHierarchy
              nodes={nodes}
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

export const NodeHierarchyItem = ({ node, onClick, selected }: INodeHierarchyItemProps) => {
  const nodeId = node.id;
  const nodeType = node.type;
  const nodeMultiPageIndex = node.multiPageIndex;
  const { onMouseEnter, onMouseLeave } = useComponentHighlighter(nodeId, false);
  const children = useNodeDirectChildren(node);
  const hasChildren = children.length > 0;
  const isHidden = Hidden.useIsHidden(node, { respectDevTools: false });

  const el = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (node.id === selected && el.current) {
      el.current.scrollIntoView({ block: 'nearest' });
    }
  }, [node, selected]);

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
            nodes={children}
            selected={selected}
            onClick={onClick}
          />
        </li>
      )}
      {/* Support for repeating groups */}
      <RepeatingGroupExtensions
        node={node}
        selected={selected}
        onClick={onClick}
      />
    </>
  );
};

function RepeatingGroupExtensions({ node, selected, onClick }: INodeHierarchyItemProps) {
  const isRepGroup = node.isType('RepeatingGroup');
  const nodeItem = useNodeItem(node) as CompInternal<'RepeatingGroup'>;

  if (!isRepGroup) {
    return null;
  }

  return (
    <>
      {nodeItem.rowsBeforeInternal && (
        <GridRowList
          rows={nodeItem.rowsBeforeInternal}
          text='rowsBefore'
          selected={selected}
          onClick={onClick}
        />
      )}
      {nodeItem.rows.map((row) => (
        <li
          className={classes.repGroupRow}
          key={row?.index}
        >
          <span className={classes.componentMetadata}>
            Rad {row?.index} {row?.groupExpressions?.hiddenRow === true ? '(skjult)' : ''}
          </span>
          <NodeHierarchy
            nodes={row?.items}
            selected={selected}
            onClick={onClick}
          />
        </li>
      ))}
      {nodeItem.rowsAfterInternal && (
        <GridRowList
          rows={nodeItem.rowsAfterInternal}
          text='rowsAfter'
          selected={selected}
          onClick={onClick}
        />
      )}
    </>
  );
}

export function NodeHierarchy({ nodes, selected, onClick }: INodeHierarchyProps) {
  return (
    <ul className={classes.list}>
      {nodes?.map((child) => {
        if (!child) {
          return null;
        }

        return (
          <NodeHierarchyItem
            key={child.id}
            node={child}
            selected={selected}
            onClick={onClick}
          />
        );
      })}
    </ul>
  );
}

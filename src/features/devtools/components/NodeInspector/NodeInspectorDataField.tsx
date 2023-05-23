import React from 'react';

import cn from 'classnames';
import dot from 'dot-object';

import classes from 'src/features/devtools/components/NodeInspector/NodeInspector.module.css';
import { useNodeInspectorContext } from 'src/features/devtools/components/NodeInspector/NodeInspectorContext';
import { DevToolsActions } from 'src/features/devtools/data/devToolsSlice';
import { DevToolsTab } from 'src/features/devtools/data/types';
import { canBeExpression } from 'src/features/expressions/validation';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { LayoutNode } from 'src/utils/layout/LayoutNode';

interface NodeInspectorDataFieldParams {
  path: string[];
  property: string;
  value: unknown;
}

interface ValueProps extends React.PropsWithChildren {
  property: string;
  className: string;
  collapsible?: boolean;
  wasExpression?: unknown;
  exprText?: string;
}

export function Value({ children, className, property, collapsible, wasExpression, exprText }: ValueProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const extraClasses = { [classes.collapsed]: collapsed, [classes.collapsible]: collapsible };
  const dispatch = useAppDispatch();
  const context = useNodeInspectorContext();

  const editExpression = () => {
    dispatch(DevToolsActions.exprPlaygroundSetExpression({ expression: JSON.stringify(wasExpression) }));
    dispatch(
      DevToolsActions.exprPlaygroundSetContext({
        forPage: context.node?.top.top.myKey,
        forComponentId: context.node?.item.id,
      }),
    );
    dispatch(DevToolsActions.setActiveTab({ tabName: DevToolsTab.Expressions }));
  };

  return (
    <>
      <dt className={cn(className, extraClasses)}>
        {collapsible ? (
          // eslint-disable-next-line jsx-a11y/anchor-is-valid
          <a
            href={'#'}
            onClick={(e) => {
              e.preventDefault();
              setCollapsed(!collapsed);
            }}
          >
            {property}
          </a>
        ) : (
          property
        )}
      </dt>
      {collapsed ? (
        <dd className={cn(extraClasses)} />
      ) : (
        <>
          {wasExpression ? (
            <dd className={classes.typeExpression}>
              Uttrykk:
              <div className={classes.json}>
                <button onClick={editExpression}>Rediger</button>
                {JSON.stringify(wasExpression, null, 2)}
              </div>
              {exprText}
            </dd>
          ) : null}
          <dd className={cn(className, extraClasses)}>{children}</dd>
        </>
      )}
    </>
  );
}

function ExpandObject(props: { path: string[]; property: string; object: object }) {
  return (
    <Value
      property={props.property}
      className={classes.typeObject}
      collapsible={true}
    >
      <dl className={classes.propertyList}>
        {Object.keys(props.object).map((key) => (
          <NodeInspectorDataField
            key={key}
            path={[...props.path, key]}
            property={key}
            value={props.object[key]}
          />
        ))}
      </dl>
    </Value>
  );
}

function OtherNode(props: { property: string; node: LayoutNode }) {
  const context = useNodeInspectorContext();

  return (
    <Value
      property={props.property}
      className={classes.typeNode}
    >
      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
      <a
        href={'#'}
        role={'button'}
        onClick={(e) => {
          e.preventDefault();
          context.selectNode(props.node.item.id);
        }}
      >
        {props.node.item.id}
      </a>
    </Value>
  );
}

function ExpandArray(props: { path: string[]; property: string; elements: unknown[] }) {
  return (
    <Value
      property={props.property}
      className={classes.typeArray}
      collapsible={true}
    >
      <dl className={classes.propertyList}>
        {props.elements.map((element, index) => (
          <NodeInspectorDataField
            key={index}
            path={[...props.path, `[${index}]`]}
            property={`[${index}]`}
            value={element}
          />
        ))}
      </dl>
    </Value>
  );
}

export function NodeInspectorDataField({ path, property, value: inputValue }: NodeInspectorDataFieldParams) {
  const { node } = useNodeInspectorContext();

  let value = inputValue;
  const preEvaluatedValue = dot.pick(path.join('.'), node?.itemWithExpressions);
  const isExpression =
    (preEvaluatedValue !== value && Array.isArray(preEvaluatedValue) && !Array.isArray(value)) ||
    canBeExpression(value, true);

  let exprText = 'Ble evaluert til:';
  if (isExpression && node?.isRepGroup()) {
    const firstRow = node.item.rows[0];
    if (firstRow && firstRow.groupExpressions) {
      const realValue = dot.pick(path.join('.'), firstRow.groupExpressions);
      if (realValue !== undefined) {
        value = realValue;
        exprText = 'Ble evaluert til (for første rad):';
      }
    }
  }

  if (value === null) {
    return (
      <Value
        property={property}
        className={classes.typeNull}
      >
        null
      </Value>
    );
  }

  if (typeof value === 'object' && Array.isArray(value) && value.length === 0) {
    return (
      <Value
        property={property}
        className={classes.typeString}
      >
        []
      </Value>
    );
  }

  if (typeof value === 'object' && Array.isArray(value) && !isExpression) {
    return (
      <ExpandArray
        path={path}
        property={property}
        elements={value}
      />
    );
  }

  if (typeof value === 'object' && Array.isArray(value) && isExpression) {
    return (
      <Value
        property={property}
        className={classes.typeUnknown}
        wasExpression={value}
        exprText={exprText}
      >
        [uttrykk med ukjent verdi]
      </Value>
    );
  }

  if (typeof value === 'object' && value instanceof LayoutNode) {
    return (
      <OtherNode
        property={property}
        node={value}
      />
    );
  }

  if (typeof value === 'object' && Object.keys(value).length === 0) {
    return null;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return (
      <ExpandObject
        path={path}
        property={property}
        object={value}
      />
    );
  }

  if (typeof value === 'string' && value.length < 35) {
    return (
      <Value
        property={property}
        className={classes.typeString}
        wasExpression={isExpression ? preEvaluatedValue : undefined}
        exprText={exprText}
      >
        {value}
      </Value>
    );
  }

  if (typeof value === 'string') {
    return (
      <Value
        property={property}
        className={classes.typeLongString}
        wasExpression={isExpression ? preEvaluatedValue : undefined}
        exprText={exprText}
      >
        {value}
      </Value>
    );
  }

  if (typeof value === 'number') {
    return (
      <Value
        property={property}
        className={classes.typeNumber}
        wasExpression={isExpression ? preEvaluatedValue : undefined}
        exprText={exprText}
      >
        {value}
      </Value>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <Value
        property={property}
        className={classes.typeBoolean}
        wasExpression={isExpression ? preEvaluatedValue : undefined}
        exprText={exprText}
      >
        {value ? 'true' : 'false'}
      </Value>
    );
  }

  return (
    <Value
      property={property}
      className={classes.typeUnknown}
    >
      [{typeof value}]
    </Value>
  );
}

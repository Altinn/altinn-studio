import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import cn from 'classnames';
import dot from 'dot-object';
import type { ExpressionDescriptor } from '@app/layout-contract';

import classes from 'src/features/devtools/components/NodeInspector/NodeInspector.module.css';
import { useNodeInspectorContext } from 'src/features/devtools/components/NodeInspector/NodeInspectorContext';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { DevToolsTab } from 'src/features/devtools/data/types';
import { canBeExpression } from 'src/features/expressions/validation';
import { FormStore } from 'src/features/form/FormContext';
import { RepGroupHooks } from 'src/layout/RepeatingGroup/utils';
import { DataModelLocationProvider } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import { splitDashedKey } from 'src/utils/splitDashedKey';
import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';

interface NodeInspectorDataFieldParams {
  path: string[];
  property: string;
  value: unknown;
}

interface ValueProps extends React.PropsWithChildren {
  property: string;
  className?: string;
  collapsible?: boolean;
  wasExpression?: unknown;
  exprText?: string;
}

export function Value({ children, className, property, collapsible, wasExpression, exprText }: ValueProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const extraClasses = { [classes.collapsed]: collapsed, [classes.collapsible]: collapsible };
  const context = useNodeInspectorContext();
  const setExpression = useDevToolsStore((state) => state.actions.exprPlaygroundSetExpression);
  const setExprContext = useDevToolsStore((state) => state.actions.exprPlaygroundSetContext);
  const setActiveTab = useDevToolsStore((state) => state.actions.setActiveTab);

  const editExpression = () => {
    setExpression(JSON.stringify(wasExpression, null, 2));
    setExprContext(context.selectedNodeId, context.selectedBaseId);
    setActiveTab(DevToolsTab.Expressions);
  };

  return (
    <>
      <dt className={cn(className, extraClasses)}>
        {collapsible ? (
          // eslint-disable-next-line jsx-a11y/anchor-is-valid
          <a
            href='#'
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
            <dd>
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

function ExpandArray(props: { path: string[]; property: string; elements: unknown[] }) {
  return (
    <Value
      property={props.property}
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

export function NodeInspectorDataField(props: NodeInspectorDataFieldParams) {
  const { selectedNodeId } = useNodeInspectorContext();
  const { baseComponentId } = splitDashedKey(selectedNodeId ?? '');
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  if (baseComponentId && layoutLookups.getComponent(baseComponentId).type === 'RepeatingGroup') {
    return (
      <NodeInspectorDataFieldForFirstRow
        baseComponentId={baseComponentId}
        {...props}
      />
    );
  }
  if (baseComponentId) {
    return (
      <NodeInspectorDataFieldInner
        baseComponentId={baseComponentId}
        {...props}
      />
    );
  }

  return null;
}

function NodeInspectorDataFieldForFirstRow(props: NodeInspectorDataFieldParams & { baseComponentId: string }) {
  const row = RepGroupHooks.useAllBaseRows(props.baseComponentId)[0];
  const groupBinding = useDataModelBindingsFor(props.baseComponentId, 'RepeatingGroup').group;
  const rowProperty =
    props.path[0] === 'hiddenRow' ||
    (props.path[0] === 'edit' &&
      ['alertOnDelete', 'editButton', 'deleteButton', 'saveButton', 'saveAndNextButton'].includes(props.path[1])) ||
    (props.path[0] === 'textResourceBindings' &&
      [
        'saveAndNextButton',
        'saveButton',
        'editButtonClose',
        'editButtonOpen',
        'multipageNextButton',
        'multipageBackButton',
      ].includes(props.path[1]));
  if (!row || !rowProperty) {
    return <NodeInspectorDataFieldInner {...props} />;
  }
  return (
    <DataModelLocationProvider
      groupBinding={groupBinding}
      rowIndex={row.index}
    >
      <NodeInspectorDataFieldInner
        {...props}
        firstRow={true}
      />
    </DataModelLocationProvider>
  );
}

function NodeInspectorDataFieldInner(
  props: NodeInspectorDataFieldParams & { baseComponentId: string; firstRow?: boolean },
) {
  const config = useComponentConfig(props.baseComponentId);
  const descriptor = dot.pick(props.path.join('.'), Expressions[config.type]) as ExpressionDescriptor | undefined;
  if (canBeExpression(props.value, true) && descriptor && 'returnType' in descriptor) {
    return (
      <NodeInspectorExpressionField
        {...props}
        descriptor={descriptor}
      />
    );
  }
  return <NodeInspectorFieldValue {...props} />;
}

function NodeInspectorExpressionField(
  props: NodeInspectorDataFieldParams & { descriptor: ExpressionDescriptor; firstRow?: boolean },
) {
  const value = useEvalExpression(props.value as ExprValToActualOrExpr<ExprVal>, props.descriptor);
  return (
    <NodeInspectorFieldValue
      {...props}
      value={value}
      wasExpression={props.value}
    />
  );
}

function NodeInspectorFieldValue({
  path,
  property,
  value,
  wasExpression,
  firstRow,
}: NodeInspectorDataFieldParams & { wasExpression?: unknown; firstRow?: boolean }) {
  const isExpression = wasExpression !== undefined || canBeExpression(value, true);
  const exprText = firstRow ? 'Ble evaluert til (for første rad):' : 'Ble evaluert til:';
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
        wasExpression={wasExpression}
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
        wasExpression={wasExpression}
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
        wasExpression={wasExpression}
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
        wasExpression={wasExpression}
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

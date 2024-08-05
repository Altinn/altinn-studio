import type { SimpleSubexpressionValue } from '../../../../../types/SimpleSubexpressionValue';
import type { ReactNode } from 'react';
import React from 'react';
import { Paragraph, Tag } from '@digdir/designsystemet-react';
import { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import classes from './SubexpressionValueReadonly.module.css';
import { StudioCodeFragment } from '../../../../../../StudioCodeFragment';
import { LinkIcon } from '@studio/icons';
import { useStudioExpressionContext } from '../../../../../StudioExpressionContext';

export type SubexpressionValueReadonlyProps<T extends SimpleSubexpressionValueType> = {
  value: SimpleSubexpressionValue<T>;
};

export const SubexpressionValueReadonly = ({
  value,
}: SubexpressionValueReadonlyProps<SimpleSubexpressionValueType>) => {
  switch (value.type) {
    case SimpleSubexpressionValueType.DataModel:
      return <DataModelLookupValue value={value} />;
    case SimpleSubexpressionValueType.Component:
      return <ComponentLookupValue value={value} />;
    case SimpleSubexpressionValueType.GatewayAction:
      return <GatewayAction value={value} />;
    case SimpleSubexpressionValueType.GatewayActionContext:
      return <GatewayActionContextValue value={value} />;
    case SimpleSubexpressionValueType.InstanceContext:
      return <InstanceContextValue value={value} />;
    case SimpleSubexpressionValueType.String:
      return <StringValue value={value} />;
    case SimpleSubexpressionValueType.Number:
      return <NumberValue value={value} />;
    case SimpleSubexpressionValueType.Boolean:
      return <BooleanValue value={value} />;
    case SimpleSubexpressionValueType.Null:
      return <NullValue />;
  }
};

const DataModelLookupValue = ({
  value,
}: SubexpressionValueReadonlyProps<SimpleSubexpressionValueType.DataModel>) => {
  const { texts } = useStudioExpressionContext();
  return (
    <Binding
      name={texts.readonlyDataModelPath}
      binding={<StudioCodeFragment title={value.path}>{value.path}</StudioCodeFragment>}
    />
  );
};

const ComponentLookupValue = ({
  value,
}: SubexpressionValueReadonlyProps<SimpleSubexpressionValueType.Component>) => {
  const { texts } = useStudioExpressionContext();
  return (
    <Binding
      name={texts.readonlyComponentId}
      binding={<StudioCodeFragment title={value.id}>{value.id}</StudioCodeFragment>}
    />
  );
};

const InstanceContextValue = ({
  value,
}: SubexpressionValueReadonlyProps<SimpleSubexpressionValueType.InstanceContext>) => {
  const { texts } = useStudioExpressionContext();
  const name = texts.instanceContext[value.key];
  return (
    <Binding
      name={texts.readonlyInstanceContext}
      binding={
        <Tag size='small' color='info'>
          {name}
        </Tag>
      }
    />
  );
};

const GatewayActionContextValue = ({
  value,
}: SubexpressionValueReadonlyProps<SimpleSubexpressionValueType.GatewayActionContext>) => {
  const { texts } = useStudioExpressionContext();
  const name = texts.gatewayActionContext[value.key];
  return (
    <Binding
      name={texts.readonlyGatewayActionContext}
      binding={
        <Tag size='small' color='info'>
          {name}
        </Tag>
      }
    />
  );
};

const GatewayAction = ({
  value,
}: SubexpressionValueReadonlyProps<SimpleSubexpressionValueType.GatewayAction>) => {
  return <Paragraph size='small'>{value.value}</Paragraph>;
};

const Binding = ({ name, binding }: { name: string; binding: ReactNode }) => {
  return (
    <div className={classes.binding}>
      <LinkIcon />
      <Paragraph size='small'>{name}</Paragraph>
      {binding}
    </div>
  );
};

const StringValue = ({
  value,
}: SubexpressionValueReadonlyProps<SimpleSubexpressionValueType.String>) => (
  <StudioCodeFragment>&quot;{value.value}&quot;</StudioCodeFragment>
);

const NumberValue = ({
  value,
}: SubexpressionValueReadonlyProps<SimpleSubexpressionValueType.Number>) => (
  <StudioCodeFragment>{value.value}</StudioCodeFragment>
);

const BooleanValue = ({
  value,
}: SubexpressionValueReadonlyProps<SimpleSubexpressionValueType.Boolean>) => {
  const { texts } = useStudioExpressionContext();
  return (
    <Tag size='small' color={value.value ? 'success' : 'danger'}>
      {value.value ? texts.true : texts.false}
    </Tag>
  );
};

const NullValue = () => {
  return <StudioCodeFragment>null</StudioCodeFragment>;
};

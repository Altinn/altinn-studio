import type { SimpleSubexpressionValue } from '../../../../../types/SimpleSubexpressionValue';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { Paragraph, Tag } from '@digdir/designsystemet-react';
import { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import classes from './SubexpressionValueReadonly.module.css';
import { StudioCodeFragment } from '../../../../../../StudioCodeFragment';
import { LinkIcon } from '../../../../../../../../../studio-icons';
import { useStudioExpressionContext } from '../../../../../StudioExpressionContext';

export type SubexpressionValueReadonlyProps<T extends SimpleSubexpressionValueType> = {
  value: SimpleSubexpressionValue<T>;
};

export const SubexpressionValueReadonly = ({
  value,
}: SubexpressionValueReadonlyProps<SimpleSubexpressionValueType>): ReactElement => {
  switch (value.type) {
    case SimpleSubexpressionValueType.DataModel:
      return <DataModelLookupValue value={value} />;
    case SimpleSubexpressionValueType.Component:
      return <ComponentLookupValue value={value} />;
    case SimpleSubexpressionValueType.CurrentGatewayAction:
      return <CurrentGatewayAction />;
    case SimpleSubexpressionValueType.PredefinedGatewayAction:
      return <PredefinedGatewayAction value={value} />;
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
}: SubexpressionValueReadonlyProps<SimpleSubexpressionValueType.DataModel>): ReactElement => {
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
}: SubexpressionValueReadonlyProps<SimpleSubexpressionValueType.Component>): ReactElement => {
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
}: SubexpressionValueReadonlyProps<SimpleSubexpressionValueType.InstanceContext>): ReactElement => {
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

const PredefinedGatewayAction = ({
  value,
}: SubexpressionValueReadonlyProps<SimpleSubexpressionValueType.PredefinedGatewayAction>): ReactElement => {
  const { texts } = useStudioExpressionContext();
  const name = texts.predefinedGatewayActions[value.key];
  return (
    <Binding
      name={texts.readonlyPredefinedGatewayAction}
      binding={
        <Tag size='small' color='info'>
          {name}
        </Tag>
      }
    />
  );
};

const CurrentGatewayAction = (): ReactElement => {
  return <Paragraph size='small'>GatewayAction</Paragraph>;
};

const Binding = ({ name, binding }: { name: string; binding: ReactNode }): ReactElement => {
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
}: SubexpressionValueReadonlyProps<SimpleSubexpressionValueType.String>): ReactElement => (
  <StudioCodeFragment>&quot;{value.value}&quot;</StudioCodeFragment>
);

const NumberValue = ({
  value,
}: SubexpressionValueReadonlyProps<SimpleSubexpressionValueType.Number>): ReactElement => (
  <StudioCodeFragment>{value.value}</StudioCodeFragment>
);

const BooleanValue = ({
  value,
}: SubexpressionValueReadonlyProps<SimpleSubexpressionValueType.Boolean>): ReactElement => {
  const { texts } = useStudioExpressionContext();
  return (
    <Tag size='small' color={value.value ? 'success' : 'danger'}>
      {value.value ? texts.true : texts.false}
    </Tag>
  );
};

const NullValue = (): ReactElement => {
  return <StudioCodeFragment>null</StudioCodeFragment>;
};

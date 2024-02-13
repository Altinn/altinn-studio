import type { SimpleSubExpressionValue } from '../../../../../types/SimpleSubExpressionValue';
import type { ReactNode } from 'react';
import React, { useContext } from 'react';
import { Paragraph, Tag } from '@digdir/design-system-react';
import { SimpleSubExpressionValueType } from '../../../../../enums/SimpleSubExpressionValueType';
import classes from './SubExpressionValueReadonly.module.css';
import { StudioCodeFragment } from '../../../../../../StudioCodeFragment';
import { LinkIcon } from '@studio/icons';
import { StudioExpressionContext } from '../../../../../StudioExpressionContext';

export type SubExpressionValueReadonlyProps<T extends SimpleSubExpressionValueType> = {
  value: SimpleSubExpressionValue<T>;
};

export const SubExpressionValueReadonly = ({
  value,
}: SubExpressionValueReadonlyProps<SimpleSubExpressionValueType>) => {
  switch (value.type) {
    case SimpleSubExpressionValueType.Datamodel:
      return <DatamodelLookupValue value={value} />;
    case SimpleSubExpressionValueType.Component:
      return <ComponentLookupValue value={value} />;
    case SimpleSubExpressionValueType.InstanceContext:
      return <InstanceContextValue value={value} />;
    case SimpleSubExpressionValueType.String:
      return <StringValue value={value} />;
    case SimpleSubExpressionValueType.Number:
      return <NumberValue value={value} />;
    case SimpleSubExpressionValueType.Boolean:
      return <BooleanValue value={value} />;
    case SimpleSubExpressionValueType.Null:
      return <NullValue />;
  }
};

const DatamodelLookupValue = ({
  value,
}: SubExpressionValueReadonlyProps<SimpleSubExpressionValueType.Datamodel>) => {
  const { texts } = useContext(StudioExpressionContext);
  return (
    <Binding
      name={texts.readonlyDatamodelPath}
      binding={<StudioCodeFragment>{value.path}</StudioCodeFragment>}
    />
  );
};

const ComponentLookupValue = ({
  value,
}: SubExpressionValueReadonlyProps<SimpleSubExpressionValueType.Component>) => {
  const { texts } = useContext(StudioExpressionContext);
  return (
    <Binding
      name={texts.readonlyComponentId}
      binding={<StudioCodeFragment>{value.id}</StudioCodeFragment>}
    />
  );
};

const InstanceContextValue = ({
  value,
}: SubExpressionValueReadonlyProps<SimpleSubExpressionValueType.InstanceContext>) => {
  const { texts } = useContext(StudioExpressionContext);
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
}: SubExpressionValueReadonlyProps<SimpleSubExpressionValueType.String>) => (
  <StudioCodeFragment>&quot;{value.value}&quot;</StudioCodeFragment>
);

const NumberValue = ({
  value,
}: SubExpressionValueReadonlyProps<SimpleSubExpressionValueType.Number>) => (
  <StudioCodeFragment>{value.value}</StudioCodeFragment>
);

const BooleanValue = ({
  value,
}: SubExpressionValueReadonlyProps<SimpleSubExpressionValueType.Boolean>) => {
  const { texts } = useContext(StudioExpressionContext);
  return (
    <Tag size='small' color={value.value ? 'success' : 'danger'}>
      {value.value ? texts.true : texts.false}
    </Tag>
  );
};

const NullValue = () => {
  return <StudioCodeFragment>null</StudioCodeFragment>;
};

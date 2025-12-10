import React, { useState } from 'react';
import { useComponentPropertyLabel } from '../../../../hooks';
import { StudioProperty } from '@studio/components';
import { PlusCircleIcon } from '@studio/icons';
import type { SchemaConfigProps } from '../types';
import { useDisplayObjectValues } from './useDisplayObjectValues';
import { ConfigObjectPropertyCard } from './ConfigObjectPropertyCard';

export interface ConfigObjectPropertiesProps extends SchemaConfigProps {
  objectPropertyKey: string;
  editFormId: string;
  className?: string;
}

export const ConfigObjectProperty = ({
  objectPropertyKey,
  schema,
  component,
  editFormId,
  handleComponentUpdate,
  className,
}: ConfigObjectPropertiesProps) => {
  const componentPropertyLabel = useComponentPropertyLabel();
  const [openObjectCard, setOpenObjectCard] = useState<Boolean>(false);
  const valuesToBeDisplayed = useDisplayObjectValues(component[objectPropertyKey]);

  if (!openObjectCard) {
    return (
      <StudioProperty.Button
        className={className}
        icon={!component[objectPropertyKey] && <PlusCircleIcon />}
        onClick={() => setOpenObjectCard(true)}
        property={componentPropertyLabel(objectPropertyKey)}
        value={valuesToBeDisplayed}
      />
    );
  }

  return (
    <ConfigObjectPropertyCard
      component={component}
      schema={schema}
      objectPropertyKey={objectPropertyKey}
      handleComponentUpdate={handleComponentUpdate}
      setOpenObjectCard={setOpenObjectCard}
      editFormId={editFormId}
    />
  );
};

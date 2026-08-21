import { useState } from 'react';
import { useComponentPropertyLabel } from '../../../../hooks';
import { StudioProperty } from '@studio/components';
import { PlusCircleIcon } from '@studio/icons';
import type { CatalogConfigProps } from '../types';
import { ConfigObjectPropertyCard } from './ConfigObjectPropertyCard';
import { useTranslateKeyValue } from '../useTranslateKeyValue';

export interface ConfigObjectPropertyProps extends CatalogConfigProps {
  objectPropertyKey: string;
  editFormId: string;
  className?: string;
}

export const ConfigObjectProperty = ({
  objectPropertyKey,
  properties,
  component,
  editFormId,
  handleComponentUpdate,
  className,
}: ConfigObjectPropertyProps) => {
  const componentPropertyLabel = useComponentPropertyLabel();
  const [openObjectCard, setOpenObjectCard] = useState<boolean>(false);
  const translatedKeyValue = useTranslateKeyValue(component[objectPropertyKey]);

  if (!openObjectCard) {
    return (
      <StudioProperty.Button
        className={className}
        icon={!component[objectPropertyKey] && <PlusCircleIcon />}
        onClick={() => setOpenObjectCard(true)}
        property={componentPropertyLabel(objectPropertyKey, properties[objectPropertyKey])}
        value={translatedKeyValue}
      />
    );
  }

  return (
    <ConfigObjectPropertyCard
      component={component}
      properties={properties}
      objectPropertyKey={objectPropertyKey}
      handleComponentUpdate={handleComponentUpdate}
      setOpenObjectCard={setOpenObjectCard}
      editFormId={editFormId}
    />
  );
};

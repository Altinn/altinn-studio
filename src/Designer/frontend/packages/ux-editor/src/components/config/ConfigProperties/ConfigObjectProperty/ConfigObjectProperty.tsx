import React, { useState } from 'react';
import { useComponentPropertyLabel, useText } from '../../../../hooks';
import { StudioProperty, StudioConfigCard, StudioParagraph } from '@studio/components';
import { PlusCircleIcon } from '@studio/icons';
import { FormComponentConfig } from '../../FormComponentConfig';
import { useComponentPropertyDescription } from '../../../../hooks/useComponentPropertyDescription';
import type { FormComponent } from '../../../../types/FormComponent';
import type { SchemaConfigProps } from '../types';
import { useDisplayObjectValues } from './useDisplayObjectValues';

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
  const componentPropertyDescription = useComponentPropertyDescription();
  const [openObjectCard, setOpenObjectCard] = useState<Boolean>(false);
  const [valuesToBeSaved, setValuesToBeSaved] = useState<object | undefined>(undefined);
  const t = useText();
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

  const handleDeleteProperty = (propertyKey: string) => {
    handleComponentUpdate({
      ...component,
      [propertyKey]: undefined,
    });
    setOpenObjectCard(false);
  };

  const handleSave = () => {
    handleComponentUpdate({
      ...component,
      [objectPropertyKey]: valuesToBeSaved,
    });
    setOpenObjectCard(false);
  };

  const handleUpdateValuesToBeSaved = (updatedComponent: object) => {
    setValuesToBeSaved({ ...valuesToBeSaved, ...updatedComponent });
  };

  return (
    <StudioConfigCard>
      <StudioConfigCard.Header
        cardLabel={componentPropertyLabel(objectPropertyKey)}
        deleteAriaLabel={t('general.delete')}
        onDelete={() => handleDeleteProperty(objectPropertyKey)}
        confirmDeleteMessage={t('general.confirm.delete')}
        isDeleteDisabled={!component[objectPropertyKey]}
      />
      <StudioConfigCard.Body>
        {componentPropertyDescription(objectPropertyKey) && (
          <StudioParagraph>{componentPropertyDescription(objectPropertyKey)}</StudioParagraph>
        )}
        <FormComponentConfig
          schema={schema.properties[objectPropertyKey] || {}}
          component={component[objectPropertyKey] || {}}
          handleComponentUpdate={(updatedComponent: FormComponent) =>
            handleUpdateValuesToBeSaved(updatedComponent)
          }
          editFormId={editFormId}
          keepEditOpen={true}
        />
      </StudioConfigCard.Body>
      <StudioConfigCard.Footer
        saveLabel={t('general.save')}
        cancelLabel={t('general.cancel')}
        onCancel={() => setOpenObjectCard(false)}
        onSave={handleSave}
      />
    </StudioConfigCard>
  );
};

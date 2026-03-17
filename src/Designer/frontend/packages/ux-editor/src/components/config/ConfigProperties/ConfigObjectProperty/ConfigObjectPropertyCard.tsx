import React, { useState } from 'react';
import { StudioConfigCard, StudioParagraph } from '@studio/components';
import {
  useComponentPropertyLabel,
  useComponentPropertyDescription,
  useText,
} from '../../../../../src/hooks';
import { FormComponentConfig } from '../../FormComponentConfig';
import type { FormComponent } from '../../../../../src/types/FormComponent';
import type { SchemaConfigProps } from '../types';
import { propHasValues } from '../ConfigPropertiesUtils';

export interface ConfigObjectPropertyCardProps extends SchemaConfigProps {
  objectPropertyKey: string;
  editFormId: string;
  setOpenObjectCard: (open: boolean) => void;
}

export const ConfigObjectPropertyCard = ({
  component,
  schema,
  objectPropertyKey,
  handleComponentUpdate,
  setOpenObjectCard,
  editFormId,
}: ConfigObjectPropertyCardProps) => {
  const [currentValues, setCurrentValues] = useState<object | undefined>(
    component[objectPropertyKey],
  );
  const componentPropertyLabel = useComponentPropertyLabel();
  const componentPropertyDescription = useComponentPropertyDescription();
  const t = useText();
  const hasObjectValues = propHasValues(component[objectPropertyKey]);

  const isSaveButtonDisabled =
    JSON.stringify(currentValues) === JSON.stringify(component[objectPropertyKey]);

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
      [objectPropertyKey]: currentValues,
    });
    setOpenObjectCard(false);
  };

  return (
    <StudioConfigCard>
      <StudioConfigCard.Header
        cardLabel={componentPropertyLabel(objectPropertyKey)}
        deleteAriaLabel={t('general.delete')}
        onDelete={() => handleDeleteProperty(objectPropertyKey)}
        confirmDeleteMessage={t('general.confirm.delete')}
        isDeleteDisabled={!hasObjectValues}
      />
      <StudioConfigCard.Body>
        {componentPropertyDescription(objectPropertyKey) && (
          <StudioParagraph>{componentPropertyDescription(objectPropertyKey)}</StudioParagraph>
        )}
        <FormComponentConfig
          schema={schema.properties[objectPropertyKey] || {}}
          component={component[objectPropertyKey] || {}}
          handleComponentUpdate={(updatedComponent: FormComponent) =>
            setCurrentValues({ ...currentValues, ...updatedComponent })
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
        isDisabled={isSaveButtonDisabled}
      />
    </StudioConfigCard>
  );
};

import React, { useState } from 'react';
import { useText } from '../../../hooks';
import { EditGrid } from '../editModal/EditGrid';
import { StudioProperty, StudioConfigCard } from '@studio/components';
import cn from 'classnames';
import type { BaseConfigProps } from './types';
import { componentComparison, propHasValues } from './ConfigPropertiesUtils';
import { useTranslateKeyValue } from './useTranslateKeyValue';

export interface ConfigGridPropertiesProps extends BaseConfigProps {
  className?: string;
}

export const ConfigGridProperties = ({
  component: initialComponent,
  handleComponentUpdate,
  className,
}: ConfigGridPropertiesProps) => {
  const [showGrid, setShowGrid] = useState(false);
  const [currentComponent, setCurrentComponent] = useState(initialComponent);
  const t = useText();
  const propertyKey = 'grid';
  const translatedGridValue = useTranslateKeyValue(initialComponent[propertyKey]);

  if (!showGrid) {
    return (
      <StudioProperty.Button
        className={cn(className)}
        onClick={() => setShowGrid(true)}
        property={t('ux_editor.component_properties.grid')}
        value={translatedGridValue}
      />
    );
  }

  const handleCancel = () => {
    setCurrentComponent(initialComponent);
    setShowGrid(false);
  };

  const handleSave = () => {
    handleComponentUpdate(currentComponent);
    setShowGrid(false);
  };

  const handleDelete = () => {
    const updatedComponent = { ...currentComponent };
    delete updatedComponent.grid;
    handleComponentUpdate(updatedComponent);
    setCurrentComponent(updatedComponent);
    setShowGrid(false);
  };

  return (
    <StudioConfigCard>
      <StudioConfigCard.Header
        cardLabel={t('ux_editor.component_properties.grid')}
        deleteAriaLabel={t('general.delete')}
        onDelete={handleDelete}
        confirmDeleteMessage={t('ux_editor.properties_text.value_confirm_delete')}
        isDeleteDisabled={!propHasValues(initialComponent[propertyKey])}
      />
      <StudioConfigCard.Body>
        <EditGrid
          key={currentComponent.id}
          component={currentComponent}
          handleComponentChange={setCurrentComponent}
        />
      </StudioConfigCard.Body>
      <StudioConfigCard.Footer
        saveLabel={t('general.save')}
        cancelLabel={t('general.cancel')}
        onCancel={handleCancel}
        onSave={handleSave}
        isLoading={false}
        isDisabled={componentComparison({ initialComponent, currentComponent })}
      />
    </StudioConfigCard>
  );
};

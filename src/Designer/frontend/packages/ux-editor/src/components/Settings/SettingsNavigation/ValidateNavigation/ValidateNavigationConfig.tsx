import React, { useState } from 'react';
import { StudioConfigCard, StudioProperty } from '@studio/components';
import { type Scope, getCardLabel, getDefaultConfig } from './utils/ValidateNavigationUtils';
import { useTranslation } from 'react-i18next';
import classes from './ValidateNavigationConfig.module.css';
import { ValidateCardContent } from './ValidateCardContent/ValidateCardContent';
import type { ValidateConfigState } from './utils/ValidateNavigationTypes';
import { useComponentPropertyEnumValue } from '@altinn/ux-editor/hooks';

export type ValidateNavigationConfigProps = {
  propertyLabel: string;
  scope: Scope;
  config?: ValidateConfigState;
  onSave: (config: ValidateConfigState) => void;
};

export const ValidateNavigationConfig = ({
  propertyLabel,
  scope,
  config,
  onSave,
}: ValidateNavigationConfigProps) => {
  const [isEditMode, setIsEditMode] = useState(false);

  const enumValue = useComponentPropertyEnumValue();

  const valueToDisplay = config
    ? `Varianter: ${config?.types.map((type) => enumValue(type.label)).join(', ') || ''}. Omfang: ${enumValue(config?.pageScope?.label) || ''}`
    : null;

  if (!isEditMode) {
    return (
      <StudioProperty.Button
        onClick={() => setIsEditMode(true)}
        property={propertyLabel}
        value={valueToDisplay}
        className={classes.configWrapper}
      />
    );
  }

  return (
    <ValidateCard scope={scope} config={config} setIsEditMode={setIsEditMode} onSave={onSave} />
  );
};

type ValidateCardProps = {
  scope: Scope;
  config?: ValidateConfigState;
  setIsEditMode: (isEditMode: boolean) => void;
  onSave: (config: ValidateConfigState) => void; // This will be used in next PR when we implement actual save logic
};

const ValidateCard = ({ scope, config, setIsEditMode, onSave }: ValidateCardProps) => {
  const { t } = useTranslation();
  const [currentConfig, setCurrentConfig] = useState<ValidateConfigState>(
    config || getDefaultConfig(scope),
  );

  const update = (updates: Partial<ValidateConfigState>) => {
    setCurrentConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleDelete = () => {
    // For now just log the config that would be deleted, will implement actual delete logic in next PR
    console.log(`Deleted validation rule with config: ${currentConfig} for ${scope}`);
    setIsEditMode(false);
  };

  const handleSaveAndClose = () => {
    onSave(currentConfig);
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setIsEditMode(false);
  };

  return (
    <StudioConfigCard className={classes.configWrapper}>
      <StudioConfigCard.Header
        cardLabel={t(getCardLabel(scope))}
        deleteAriaLabel={t('general.delete')}
        onDelete={handleDelete}
      />
      <StudioConfigCard.Body>
        <ValidateCardContent scope={scope} config={currentConfig} onChange={update} />
      </StudioConfigCard.Body>
      <StudioConfigCard.Footer
        saveLabel={t('general.save')}
        cancelLabel={t('general.cancel')}
        onSave={handleSaveAndClose}
        onCancel={handleCancel}
      />
    </StudioConfigCard>
  );
};

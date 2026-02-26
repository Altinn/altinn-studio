import React, { useState } from 'react';
import { StudioAlert, StudioConfigCard, StudioProperty } from '@studio/components';
import {
  type Scope,
  isRuleDuplicateInScope,
  getCardLabel,
  getDefaultConfig,
  getValuesToDisplay,
  validateForm,
} from './utils/ValidateNavigationUtils';
import { useTranslation } from 'react-i18next';
import classes from './ValidateNavigationConfig.module.css';
import { ValidateCardContent } from './ValidateCardContent/ValidateCardContent';
import type { InternalConfigState } from './utils/ValidateNavigationTypes';

export type ValidateNavigationConfigProps = {
  propertyLabel: string;
  scope: Scope;
  config?: InternalConfigState;
  existingConfigs?: InternalConfigState[];
  onSave: (config: InternalConfigState) => void;
  onDelete?: () => void;
};

export const ValidateNavigationConfig = ({
  propertyLabel,
  scope,
  config,
  existingConfigs,
  onSave,
  onDelete,
}: ValidateNavigationConfigProps) => {
  const [isEditMode, setIsEditMode] = useState(false);

  if (!isEditMode) {
    return (
      <StudioProperty.Button
        onClick={() => setIsEditMode(true)}
        property={propertyLabel}
        value={config && <DisplayValues {...config} />}
        className={classes.configWrapper}
      />
    );
  }

  return (
    <ValidateCard
      scope={scope}
      config={config}
      existingConfigs={existingConfigs}
      setIsEditMode={setIsEditMode}
      onSave={onSave}
      onDelete={onDelete}
    />
  );
};

type ValidateCardProps = {
  scope: Scope;
  config?: InternalConfigState;
  existingConfigs?: InternalConfigState[];
  setIsEditMode: (isEditMode: boolean) => void;
  onSave: (config: InternalConfigState) => void;
  onDelete?: () => void;
};

const ValidateCard = ({
  scope,
  config,
  existingConfigs,
  setIsEditMode,
  onSave,
  onDelete,
}: ValidateCardProps) => {
  const { t } = useTranslation();
  const [newConfig, setNewConfig] = useState<InternalConfigState>(
    config || getDefaultConfig(scope),
  );
  const isFormValid = validateForm({ scope, config, newConfig });
  const isRuleDuplicate = isRuleDuplicateInScope({
    scope,
    newConfig,
    existingConfigs,
    isFormValid,
  });

  const update = (updates: Partial<InternalConfigState>) => {
    setNewConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleDelete = () => {
    onDelete?.();
    setIsEditMode(false);
  };

  const handleSaveAndClose = () => {
    onSave(newConfig);
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
        isDeleteDisabled={!config}
      />
      <StudioConfigCard.Body>
        <ValidateCardContent scope={scope} newConfig={newConfig} onChange={update} />
        {isRuleDuplicate && (
          <StudioAlert data-color='info'>
            {t('ux_editor.settings.navigation_validation_alert_message')}
          </StudioAlert>
        )}
      </StudioConfigCard.Body>
      <StudioConfigCard.Footer
        saveLabel={t('general.save')}
        cancelLabel={t('general.cancel')}
        onSave={handleSaveAndClose}
        onCancel={handleCancel}
        isDisabled={!isFormValid}
      />
    </StudioConfigCard>
  );
};

const DisplayValues = (config: InternalConfigState) => {
  const valueToDisplay = getValuesToDisplay(config);

  return (
    <div>
      {Object.entries(valueToDisplay).map(([key, value]) => (
        <div key={key}> {value}</div>
      ))}
    </div>
  );
};

import React, { useState } from 'react';
import { StudioConfigCard, StudioProperty } from '@studio/components';
import type { Scope } from './ValidateNavigation';
import { useTranslation } from 'react-i18next';
import classes from './ValidateNavigationConfig.module.css';
import { ValidationCardContent, type ValidationConfigState } from './ValidationCardContent';
import { getCardLabel, getDefaultConfig } from './ValidateNavigationUtils';

type ValidationConfigProps = {
  propertyLabel: string;
  scope: Scope;
};

export const ValidationConfig = ({ propertyLabel, scope }: ValidationConfigProps) => {
  const [isEditMode, setIsEditMode] = useState(false);

  if (!isEditMode) {
    return (
      <StudioProperty.Button
        onClick={() => setIsEditMode(true)}
        property={propertyLabel}
        value={null} // For now left as null since we don't have a real config object, will replace with actual config in next PR
        className={classes.configWrapper}
      />
    );
  }

  return <ValidationCard scope={scope} setIsEditMode={setIsEditMode} />;
};

type ValidationCardProps = {
  scope: Scope;
  setIsEditMode: (isEditMode: boolean) => void;
};

const ValidationCard = ({ scope, setIsEditMode }: ValidationCardProps) => {
  const getConfig = null; // Placeholder for function that would get the actual config based on scope, will implement in next PR
  const { t } = useTranslation();
  const [config, setConfig] = useState<ValidationConfigState>(getConfig || getDefaultConfig(scope));

  const update = (updates: Partial<ValidationConfigState>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleDelete = () => {
    // For now just log the config that would be deleted, will implement actual delete logic in next PR
    console.log(`Deleted validation rule with config: ${config} for ${scope}`);
    setIsEditMode(false);
  };

  const handleSave = () => {
    // For now just log the config that would be  saved, will implement actual save logic in next PR
    console.log(`Saved validation rule with config:`, config, `for scope: ${scope}`);
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setIsEditMode(false);
  };

  return (
    <StudioConfigCard className={classes.configWrapper}>
      <StudioConfigCard.Header
        cardLabel={getCardLabel(scope)}
        deleteAriaLabel='Slett regel'
        onDelete={handleDelete}
      />
      <StudioConfigCard.Body>
        <ValidationCardContent scope={scope} config={config} onChange={update} />
      </StudioConfigCard.Body>
      <StudioConfigCard.Footer
        saveLabel={t('general.save')}
        cancelLabel={t('general.cancel')}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </StudioConfigCard>
  );
};

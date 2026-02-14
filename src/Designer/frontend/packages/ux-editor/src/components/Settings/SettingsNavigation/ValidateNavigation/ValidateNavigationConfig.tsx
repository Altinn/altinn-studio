import React, { useState } from 'react';
import { StudioConfigCard, StudioProperty } from '@studio/components';
import type { Scope } from './ValidateNavigationUtils';
import { useTranslation } from 'react-i18next';
import classes from './ValidateNavigationConfig.module.css';
import { ValidateCardContent } from './ValidateCardContent';
import type { ValidateConfigState } from './ValidateNavigationTypes';
import { getCardLabel, getDefaultConfig } from './ValidateNavigationUtils';

export type ValidateNavigationConfigProps = {
  propertyLabel: string;
  scope: Scope;
};

export const ValidateNavigationConfig = ({
  propertyLabel,
  scope,
}: ValidateNavigationConfigProps) => {
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

  return <ValidateCard scope={scope} setIsEditMode={setIsEditMode} />;
};

type ValidateCardProps = {
  scope: Scope;
  setIsEditMode: (isEditMode: boolean) => void;
};

const ValidateCard = ({ scope, setIsEditMode }: ValidateCardProps) => {
  const getConfig = null; // Placeholder for function that would get the actual config based on scope, will implement in next PR
  const { t } = useTranslation();
  const [config, setConfig] = useState<ValidateConfigState>(getConfig || getDefaultConfig(scope));

  const update = (updates: Partial<ValidateConfigState>) => {
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
        cardLabel={t(getCardLabel(scope))}
        deleteAriaLabel={t('general.delete')}
        onDelete={handleDelete}
      />
      <StudioConfigCard.Body>
        <ValidateCardContent scope={scope} config={config} onChange={update} />
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

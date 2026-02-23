import React, { useState } from 'react';
import { StudioConfigCard, StudioProperty } from '@studio/components';
import {
  type Scope,
  getCardLabel,
  getDefaultConfig,
  getValuesToDisplay,
} from './utils/ValidateNavigationUtils';
import { useTranslation } from 'react-i18next';
import classes from './ValidateNavigationConfig.module.css';
import { ValidateCardContent } from './ValidateCardContent/ValidateCardContent';
import type { InternalConfigState } from './utils/ValidateNavigationTypes';

export type ValidateNavigationConfigProps = {
  propertyLabel: string;
  scope: Scope;
  config?: InternalConfigState;
  onSave: (config: InternalConfigState) => void;
  onDelete?: () => void;
};

export const ValidateNavigationConfig = ({
  propertyLabel,
  scope,
  config,
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
      setIsEditMode={setIsEditMode}
      onSave={onSave}
      onDelete={onDelete}
    />
  );
};

type ValidateCardProps = {
  scope: Scope;
  config?: InternalConfigState;
  setIsEditMode: (isEditMode: boolean) => void;
  onSave: (config: InternalConfigState) => void;
  onDelete?: () => void;
};

const ValidateCard = ({ scope, config, setIsEditMode, onSave, onDelete }: ValidateCardProps) => {
  const { t } = useTranslation();
  const [currentConfig, setCurrentConfig] = useState<InternalConfigState>(
    config || getDefaultConfig(scope),
  );

  const update = (updates: Partial<InternalConfigState>) => {
    setCurrentConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleDelete = () => {
    onDelete?.();
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
        isDeleteDisabled={!config}
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

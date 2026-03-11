import React, { useState } from 'react';
import {
  StudioAlert,
  StudioLabel,
  StudioProperty,
  StudioDialog,
  StudioPageHeader,
  StudioFormActions,
  StudioDeleteButton,
} from '@studio/components';
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
import cn from 'classnames';

export type ValidateNavigationConfigProps = {
  scope: Scope;
  config?: InternalConfigState;
  existingConfigs?: InternalConfigState[];
  onSave: (config: InternalConfigState) => void;
  onDelete?: () => void;
};

export const ValidateNavigationConfig = ({
  scope,
  config,
  existingConfigs,
  onSave,
  onDelete,
}: ValidateNavigationConfigProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useTranslation();

  const getButtonLabel = (currentConfig: InternalConfigState) => {
    return !currentConfig && t('ux_editor.settings.navigation_validation_button_rule_undefined');
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <StudioProperty.Button
        onClick={handleOpenModal}
        property={getButtonLabel(config)}
        title={config && t('ux_editor.settings.navigation_validation_button_rule_defined')}
        value={config && <DisplayValues {...config} />}
        className={cn(classes.configWrapper, { [classes.configDefined]: config })}
      />
      {isModalOpen && (
        <ConfigModal
          scope={scope}
          config={config}
          existingConfigs={existingConfigs}
          onClose={() => setIsModalOpen(false)}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </>
  );
};

type ValidateCardProps = {
  scope: Scope;
  config?: InternalConfigState;
  existingConfigs?: InternalConfigState[];
  onClose: () => void;
  onSave: (config: InternalConfigState) => void;
  onDelete?: () => void;
};

const ConfigModal = ({
  scope,
  config,
  existingConfigs,
  onClose,
  onSave,
  onDelete,
}: ValidateCardProps) => {
  const { t } = useTranslation();
  const initalConfig = config || getDefaultConfig(scope);
  const [newConfig, setNewConfig] = useState<InternalConfigState>(initalConfig);
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
    onClose();
  };

  const handleSaveAndClose = () => {
    onSave(newConfig);
    onClose();
  };

  return (
    <StudioDialog open={true} onClose={onClose}>
      <StudioDialog.Block>
        <StudioPageHeader>{t(getCardLabel(scope))}</StudioPageHeader>
      </StudioDialog.Block>
      <StudioDialog.Block className={classes.modalFields}>
        <ValidateCardContent scope={scope} newConfig={newConfig} onChange={update} />
        {isRuleDuplicate && (
          <StudioAlert data-color='info'>
            {t('ux_editor.settings.navigation_validation_alert_message')}
          </StudioAlert>
        )}
      </StudioDialog.Block>
      <StudioDialog.Block className={classes.modalActions}>
        <StudioFormActions
          primary={{
            label: t('general.save'),
            onClick: handleSaveAndClose,
            disabled: !isFormValid,
          }}
          secondary={{
            label: t('general.cancel'),
            onClick: onClose,
          }}
          isLoading={false}
        />
        <StudioDeleteButton onDelete={handleDelete} disabled={!config} variant='tertiary'>
          {t('general.delete')}
        </StudioDeleteButton>
      </StudioDialog.Block>
    </StudioDialog>
  );
};

const DisplayValues = (config: InternalConfigState) => {
  const valueToDisplay = getValuesToDisplay(config);
  const { t } = useTranslation();
  const translateKeyToDisplay = (key: string) => {
    return t(`ux_editor.settings.navigation_validation_view_mode_label_${key}`);
  };

  return (
    <div>
      {Object.entries(valueToDisplay).map(([key, value]) => (
        <div key={key}>
          <StudioLabel>{translateKeyToDisplay(key)}:</StudioLabel> {value}
        </div>
      ))}
    </div>
  );
};

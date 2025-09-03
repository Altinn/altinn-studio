import React, { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioButton,
  StudioDialog,
  StudioRadio,
  StudioRadioGroup,
  useStudioRadioGroup,
} from '@studio/components';
import { getEnvLabel } from '../../utils/resourceUtils';
import type { EnvId } from '../../utils/resourceUtils';
import { ResourceAdmDialogContent } from '../ResourceAdmDialogContent/ResourceAdmDialogContent';

interface ImportAltinn3ResourceModalProps {
  availableEnvs: EnvId[];
  onClose: () => void;
  onImport: (env: EnvId) => void;
}

export const ImportAltinn3ResourceModal = forwardRef<
  HTMLDialogElement,
  ImportAltinn3ResourceModalProps
>(({ availableEnvs, onClose, onImport }, ref): React.JSX.Element => {
  const { t } = useTranslation();

  const [selectedEnv, setSelectedEnv] = useState<EnvId | null>(null);

  const { getRadioProps } = useStudioRadioGroup({
    value: selectedEnv,
    onChange: (value) => setSelectedEnv(value as EnvId),
  });

  const onCloseModal = (): void => {
    setSelectedEnv(null);
    onClose();
  };

  const onImportResource = (): void => {
    setSelectedEnv(null);
    onImport(selectedEnv as EnvId);
  };

  return (
    <StudioDialog ref={ref} onClose={onCloseModal}>
      <ResourceAdmDialogContent
        heading={t('resourceadm.dashboard_import_environment_header')}
        footer={
          <>
            <StudioButton variant='primary' disabled={!selectedEnv} onClick={onImportResource}>
              {t('resourceadm.dashboard_import_environment_confirm')}
            </StudioButton>
            <StudioButton variant='tertiary' onClick={onCloseModal}>
              {t('general.cancel')}
            </StudioButton>
          </>
        }
      >
        <StudioRadioGroup legend={t('resourceadm.dashboard_import_environment_radio_header')}>
          {availableEnvs.map((env) => (
            <StudioRadio key={env} label={t(getEnvLabel(env))} {...getRadioProps({ value: env })} />
          ))}
        </StudioRadioGroup>
      </ResourceAdmDialogContent>
    </StudioDialog>
  );
});

ImportAltinn3ResourceModal.displayName = 'ImportAltinn3ResourceModal';

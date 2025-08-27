import React, { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioModal, StudioRadio } from 'libs/studio-components-legacy/src';
import { getEnvLabel } from '../../utils/resourceUtils';
import type { EnvId } from '../../utils/resourceUtils';

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

  const onCloseModal = (): void => {
    setSelectedEnv(null);
    onClose();
  };

  const onImportResource = (): void => {
    setSelectedEnv(null);
    onImport(selectedEnv as EnvId);
  };

  return (
    <StudioModal.Root>
      <StudioModal.Dialog
        ref={ref}
        heading={t('resourceadm.dashboard_import_environment_header')}
        closeButtonTitle={t('resourceadm.close_modal')}
        onClose={onCloseModal}
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
        <StudioRadio.Group
          legend={t('resourceadm.dashboard_import_environment_radio_header')}
          value={selectedEnv ?? '-'} // bug: default value of radio cannot be null or undefined; that will cause the component to be uncontrolled until a value is set
          onChange={(newEnv: string) => setSelectedEnv(newEnv as EnvId)}
        >
          {availableEnvs.map((env) => (
            <StudioRadio key={env} value={env}>
              {t(getEnvLabel(env))}
            </StudioRadio>
          ))}
        </StudioRadio.Group>
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
});

ImportAltinn3ResourceModal.displayName = 'ImportAltinn3ResourceModal';

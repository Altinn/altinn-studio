import React, { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Radio } from '@digdir/design-system-react';
import { StudioButton } from '@studio/components';
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

  const [selectedEnv, setSelectedEnv] = useState<EnvId | null>();

  const onCloseModal = (): void => {
    setSelectedEnv(null);
    onClose();
  };

  const onImportResource = (): void => {
    setSelectedEnv(null);
    onImport(selectedEnv);
  };

  return (
    <Modal ref={ref} onClose={onCloseModal}>
      <Modal.Header>{t('resourceadm.dashboard_import_environment_header')}</Modal.Header>
      <Modal.Content>
        <Radio.Group
          legend={t('resourceadm.dashboard_import_environment_radio_header')}
          value={selectedEnv}
          onChange={(newEnv: string) => setSelectedEnv(newEnv as EnvId)}
        >
          {availableEnvs.map((env) => (
            <Radio key={env} value={env}>
              {t(getEnvLabel(env))}
            </Radio>
          ))}
        </Radio.Group>
      </Modal.Content>
      <Modal.Footer>
        <StudioButton variant='primary' disabled={!selectedEnv} onClick={onImportResource}>
          {t('resourceadm.dashboard_import_environment_confirm')}
        </StudioButton>
        <StudioButton variant='tertiary' onClick={onCloseModal}>
          {t('general.cancel')}
        </StudioButton>
      </Modal.Footer>
    </Modal>
  );
});

ImportAltinn3ResourceModal.displayName = 'ImportAltinn3ResourceModal';

import React from 'react';
import { StudioDialog, StudioHeading } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { DialogContent } from './components/DialogContent';

type UndeployConsequenceDialogProps = {
  environment: string;
  isOpen: boolean;
  onClose: () => void;
};

export const UndeployConsequenceDialog = ({
  environment,
  isOpen,
  onClose,
}: UndeployConsequenceDialogProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <StudioDialog open={isOpen} onClose={onClose}>
      <StudioDialog.Block>
        <StudioHeading level={2}>
          {t('app_deployment.unpublish_consequence_dialog_title')}
        </StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block>
        <DialogContent environment={environment} />
      </StudioDialog.Block>
    </StudioDialog>
  );
};

import React from 'react';

import { Button, ConfirmPopover } from '@app/form-component';

import { Lang } from 'src/features/language/Lang';
import type { Message } from 'src/layout/BrokerFileTransfer/messages';

type CancelUploadButtonProps = {
  label: Message['key'];
  confirmLabel: Message['key'];
  onConfirm: () => void;
};

export function CancelUploadButton({ label, confirmLabel, onConfirm }: CancelUploadButtonProps) {
  return (
    <ConfirmPopover
      message={<Lang id='broker_file_transfer.cancel_confirm' />}
      confirmText={<Lang id={confirmLabel} />}
      cancelText={<Lang id='broker_file_transfer.cancel_confirm_no' />}
      onConfirm={onConfirm}
      color='danger'
      placement='top'
    >
      <Button
        variant='tertiary'
        color='danger'
      >
        <Lang id={label} />
      </Button>
    </ConfirmPopover>
  );
}

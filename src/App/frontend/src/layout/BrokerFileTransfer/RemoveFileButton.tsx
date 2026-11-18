import React from 'react';

import { Button } from '@app/form-component';
import { TrashIcon } from '@navikt/aksel-icons';

import { Lang } from 'src/features/language/Lang';

type RemoveFileButtonProps = {
  onRemove: () => void;
};

/** A button that removes the chosen file, or a file Broker rejected, without asking first */
export function RemoveFileButton({ onRemove }: RemoveFileButtonProps) {
  return (
    <Button
      variant='tertiary'
      color='danger'
      onClick={onRemove}
    >
      <Lang id='broker_file_transfer.remove_file' />
      <TrashIcon
        fontSize='1rem'
        aria-hidden
      />
    </Button>
  );
}

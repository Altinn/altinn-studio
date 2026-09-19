import { useRef } from 'react';
import type { ReactElement } from 'react';
import {
  StudioButton,
  StudioDialog,
  StudioHeading,
  StudioParagraph,
  StudioSpinner,
} from '@studio/components';
import { useTranslation } from 'react-i18next';

import classes from './ConfirmActionDialog.module.css';

export type ConfirmActionDialogProps = {
  triggerLabel: string;
  /** Spelled out in the dialog: what the action does, so nobody confirms it blind. */
  heading: string;
  description: string;
  confirmLabel: string;
  color?: string;
  isPending?: boolean;
  onConfirm: () => void;
};

export const ConfirmActionDialog = ({
  triggerLabel,
  heading,
  description,
  confirmLabel,
  color = 'accent',
  isPending = false,
  onConfirm,
}: ConfirmActionDialogProps): ReactElement => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  // showModal() hands the initial focus to the first focusable descendant, which is the confirm
  // button — so a keyboard user pressing Enter as the dialog appears would confirm without reading
  // it. Cancel takes the focus instead; confirming has to be a deliberate move.
  const handleOpen = () => {
    dialogRef.current?.showModal();
    cancelRef.current?.focus();
  };

  const handleConfirm = () => {
    dialogRef.current?.close();
    onConfirm();
  };

  return (
    <>
      <StudioButton
        data-size='sm'
        data-color={color}
        variant='secondary'
        disabled={isPending}
        onClick={handleOpen}
      >
        {isPending && <StudioSpinner aria-label={t('general.loading')} />}
        {triggerLabel}
      </StudioButton>
      <StudioDialog ref={dialogRef} data-color={color}>
        <StudioDialog.Block>
          <StudioHeading level={2} data-size='xs'>
            {heading}
          </StudioHeading>
        </StudioDialog.Block>
        <StudioDialog.Block>
          <StudioParagraph data-size='sm'>{description}</StudioParagraph>
        </StudioDialog.Block>
        <StudioDialog.Block className={classes.actions}>
          <StudioButton data-size='sm' data-color={color} onClick={handleConfirm}>
            {confirmLabel}
          </StudioButton>
          <StudioButton
            ref={cancelRef}
            data-size='sm'
            variant='tertiary'
            onClick={() => dialogRef.current?.close()}
          >
            {t('general.cancel')}
          </StudioButton>
        </StudioDialog.Block>
      </StudioDialog>
    </>
  );
};

import React from 'react';
import classes from './DeleteDialog.module.css';
import type { PopoverProps } from '@digdir/design-system-react';
import { Button, ButtonColor, ButtonVariant, Popover } from '@digdir/design-system-react';
import { Panel, PanelVariant } from '@altinn/altinn-design-system';
import { useTranslation } from 'react-i18next';

export type IDeleteDialogProps = {
  schemaName: string;
  onConfirm: () => void;
  onCancel: () => void;
} & Pick<PopoverProps, 'trigger' | 'open'>;

export function DeleteDialog({
  onCancel,
  onConfirm,
  open,
  schemaName,
  trigger,
}: IDeleteDialogProps) {
  const { t } = useTranslation();
  const description = t('administration.delete_model_confirm', { schemaName });
  return (
    <Popover trigger={trigger} open={open} placement='bottom' className={classes.popover}>
      <Panel variant={PanelVariant.Warning}>
        <p>{description}</p>
        <div className={classes.buttons}>
          <Button
            color={ButtonColor.Danger}
            id='confirm-delete-button'
            onClick={onConfirm}
            variant={ButtonVariant.Filled}
          >
            {t('general.continue')}
          </Button>
          <Button
            color={ButtonColor.Secondary}
            id='cancel-delete-button'
            onClick={onCancel}
            variant={ButtonVariant.Filled}
          >
            {t('general.cancel')}
          </Button>
        </div>
      </Panel>
    </Popover>
  );
}

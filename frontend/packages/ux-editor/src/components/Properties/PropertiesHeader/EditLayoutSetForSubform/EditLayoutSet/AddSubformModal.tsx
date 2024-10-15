import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioModal } from '@studio/components';
import { useForwardedRef } from '@studio/hooks';
import { ClipboardIcon } from '@studio/icons';
import { Paragraph } from '@digdir/designsystemet-react';
import classes from './EditLayoutSet.module.css';
import { useSelectLayoutSet } from './RenderSelectLayoutSet';

export type AddSubformModalProps = {
  existingLayoutSetForSubform: string;
  onUpdateLayoutSet: (layoutSetId: string) => void;
};

export const AddSubformModal = forwardRef<HTMLDialogElement, AddSubformModalProps>(
  ({ existingLayoutSetForSubform, onUpdateLayoutSet }, ref): JSX.Element => {
    const { t } = useTranslation();
    const dialogRef = useForwardedRef<HTMLDialogElement>(ref);

    const { isLayoutSetSelectorVisible, renderSelectLayoutSet } = useSelectLayoutSet({
      existingLayoutSetForSubform,
      onUpdateLayoutSet,
    });

    if (isLayoutSetSelectorVisible) return renderSelectLayoutSet;

    return (
      <StudioModal.Root>
        <StudioModal.Dialog
          closeButtonTitle={''}
          icon={<ClipboardIcon />}
          heading={t('ux_editor.component_properties.subform.choose_layout_set_header')}
          ref={dialogRef}
        >
          <Paragraph className={classes.paragraph}>
            {t('ux_editor.component_properties.subform.choose_layout_set_description')}
          </Paragraph>
          {renderSelectLayoutSet}
        </StudioModal.Dialog>
      </StudioModal.Root>
    );
  },
);

AddSubformModal.displayName = 'AddSubformModal';

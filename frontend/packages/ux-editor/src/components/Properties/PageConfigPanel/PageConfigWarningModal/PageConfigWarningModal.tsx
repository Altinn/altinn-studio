import type { ReactNode } from 'react';
import React from 'react';
import classes from './PageConfigWarningModal.module.css';
import { useTranslation } from 'react-i18next';
import { StudioDialog, StudioHeading } from '@studio/components';

export interface PageConfigWarningModalProps {
  open: boolean;
}

export const PageConfigWarningModal = ({ open }: PageConfigWarningModalProps): ReactNode => {
  const { t } = useTranslation();
  return (
    <StudioDialog open={open}>
      <StudioDialog.Block>
        <StudioHeading>{t('ux_editor.modal_properties_warning_modal_title')}</StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block>
        <div className={classes.subTitle}>
          {t('ux_editor.modal_properties_warning_modal_sub_title')}
        </div>
        {t('ux_editor.modal_properties_warning_modal_instructive_text_body')}
      </StudioDialog.Block>
    </StudioDialog>
  );
};

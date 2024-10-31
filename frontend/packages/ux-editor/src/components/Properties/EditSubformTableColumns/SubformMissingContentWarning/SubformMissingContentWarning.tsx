import { PencilIcon } from '@studio/icons';
import { StudioAlert, StudioButton, StudioHeading, StudioParagraph } from '@studio/components';
import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@altinn/ux-editor/hooks';
import classes from './SubformMissingContentWarning.module.css';

type SubformMissingContentWarningProps = {
  subformLayoutSetName: string;
};

export const SubformMissingContentWarning = ({
  subformLayoutSetName: subformLayoutSetName,
}: SubformMissingContentWarningProps): ReactElement => {
  const { setSelectedFormLayoutName, setSelectedFormLayoutSetName } = useAppContext();
  const { t } = useTranslation();

  const handleOnRedirectClick = (): void => {
    setSelectedFormLayoutSetName(subformLayoutSetName);
    setSelectedFormLayoutName(undefined);
  };

  return (
    <StudioAlert severity='warning'>
      <StudioHeading size='2xs' level={2}>
        {t('ux_editor.component_properties.subform.layout_set_is_missing_content_heading')}
      </StudioHeading>
      <StudioParagraph size='sm'>
        {t('ux_editor.component_properties.subform.layout_set_is_missing_content_paragraph')}
      </StudioParagraph>
      <StudioButton
        onClick={handleOnRedirectClick}
        variant='primary'
        color='second'
        icon={<PencilIcon />}
        iconPlacement='left'
        disabled={!subformLayoutSetName}
        className={classes.redirectButton}
      >
        {t('top_menu.create')}
      </StudioButton>
    </StudioAlert>
  );
};

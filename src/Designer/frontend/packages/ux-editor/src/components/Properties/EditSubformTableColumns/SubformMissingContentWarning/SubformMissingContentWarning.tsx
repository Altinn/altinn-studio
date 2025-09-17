import { PencilIcon } from '@studio/icons';
import { StudioAlert, StudioButton } from '@studio/components-legacy';
import { StudioParagraph, StudioHeading } from '@studio/components';
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
      <StudioHeading level={2} spacing>
        {t('ux_editor.component_properties.subform.layout_set_is_missing_content_heading')}
      </StudioHeading>
      <StudioParagraph>
        {t('ux_editor.component_properties.subform.layout_set_is_missing_content_paragraph')}
      </StudioParagraph>
      <StudioButton
        onClick={handleOnRedirectClick}
        color='second'
        icon={<PencilIcon />}
        disabled={!subformLayoutSetName}
        className={classes.redirectButton}
      >
        {t('ux_editor.component_properties.navigate_to_subform_button')}
      </StudioButton>
    </StudioAlert>
  );
};

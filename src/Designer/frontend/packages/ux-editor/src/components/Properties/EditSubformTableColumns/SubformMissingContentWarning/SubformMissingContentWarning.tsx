import { PencilIcon } from '@studio/icons';
import { StudioButton, StudioParagraph, StudioHeading, StudioAlert } from '@studio/components';
import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import classes from './SubformMissingContentWarning.module.css';
import { useNavigate } from 'react-router-dom';
import { useLayoutSetNavigation } from '../../../../utils/routeUtils';

type SubformMissingContentWarningProps = {
  subformLayoutSetName: string;
};

export const SubformMissingContentWarning = ({
  subformLayoutSetName: subformLayoutSetName,
}: SubformMissingContentWarningProps): ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getLayoutSetPath } = useLayoutSetNavigation();

  const handleOnRedirectClick = (): void => {
    navigate(getLayoutSetPath(subformLayoutSetName));
  };

  return (
    <StudioAlert data-color='warning'>
      <StudioHeading level={2}>
        {t('ux_editor.component_properties.subform.layout_set_is_missing_content_heading')}
      </StudioHeading>
      <StudioParagraph>
        {t('ux_editor.component_properties.subform.layout_set_is_missing_content_paragraph')}
      </StudioParagraph>
      <StudioButton
        onClick={handleOnRedirectClick}
        icon={<PencilIcon />}
        disabled={!subformLayoutSetName}
        className={classes.redirectButton}
      >
        {t('ux_editor.component_properties.navigate_to_subform_button')}
      </StudioButton>
    </StudioAlert>
  );
};

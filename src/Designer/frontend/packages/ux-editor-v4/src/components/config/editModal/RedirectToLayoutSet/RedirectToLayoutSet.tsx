import React from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon } from '@studio/icons';
import { StudioButton, StudioRedirectBox } from '@studio/components';
import classes from './RedirectToLayoutSet.module.css';
import { useNavigate } from 'react-router-dom';
import getLayoutSetPath from '../../../../utils/routeUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

type RedirectToLayoutSetProps = {
  selectedSubform: string;
};

export const RedirectToLayoutSet = ({
  selectedSubform,
}: RedirectToLayoutSetProps): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const navigate = useNavigate();

  const handleOnRedirectClick = (): void => {
    navigate(getLayoutSetPath(org, app, selectedSubform));
  };

  return (
    <StudioRedirectBox
      title={t('ux_editor.component_properties.subform.go_to_layout_set')}
      className={classes.redirectContainer}
    >
      <StudioButton
        onClick={handleOnRedirectClick}
        variant='secondary'
        icon={<PencilIcon />}
        iconPlacement='left'
      >
        {t('top_menu.create')}
      </StudioButton>
    </StudioRedirectBox>
  );
};

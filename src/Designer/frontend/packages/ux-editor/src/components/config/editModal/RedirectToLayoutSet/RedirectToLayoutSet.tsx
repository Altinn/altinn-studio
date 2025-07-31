import React from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon } from '@studio/icons';
import { StudioRedirectBox } from '@studio/components-legacy';
import { StudioButton } from '@studio/components';
import classes from './RedirectToLayoutSet.module.css';
import { useAppContext } from '../../../../hooks';
import { useNavigate } from 'react-router-dom';

type RedirectToLayoutSetProps = {
  selectedSubform: string;
};

export const RedirectToLayoutSet = ({
  selectedSubform,
}: RedirectToLayoutSetProps): React.ReactElement => {
  const { setSelectedFormLayoutName } = useAppContext();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleOnRedirectClick = (): void => {
    navigate(`layoutSet/${selectedSubform}`);
    setSelectedFormLayoutName(undefined);
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

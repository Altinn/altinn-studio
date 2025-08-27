import React from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon } from '@studio/icons';
import { StudioButton, StudioRedirectBox } from '@studio/components-legacy';
import classes from './RedirectToLayoutSet.module.css';
import { useAppContext } from '../../../../hooks';

type RedirectToLayoutSetProps = {
  selectedSubform: string;
};

export const RedirectToLayoutSet = ({
  selectedSubform,
}: RedirectToLayoutSetProps): React.ReactElement => {
  const { setSelectedFormLayoutName, setSelectedFormLayoutSetName } = useAppContext();
  const { t } = useTranslation();

  const handleOnRedirectClick = (): void => {
    setSelectedFormLayoutSetName(selectedSubform);
    setSelectedFormLayoutName(undefined);
  };

  return (
    <StudioRedirectBox
      title={t('ux_editor.component_properties.subform.go_to_layout_set')}
      className={classes.redirectContainer}
    >
      <StudioButton
        onClick={handleOnRedirectClick}
        variant='primary'
        color='second'
        icon={<PencilIcon />}
        iconPlacement='left'
      >
        {t('top_menu.create')}
      </StudioButton>
    </StudioRedirectBox>
  );
};

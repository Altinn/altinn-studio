import React from 'react';
import { PencilIcon } from '@studio/icons';
import { RedirectBox } from 'app-shared/components/RedirectBox';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';
import classes from './RedirectToLayoutSet.module.css';
import { useSelectedFormLayoutSetName } from 'app-shared/hooks/useSelectedFormLayoutSetName';

type RedirectToLayoutSetProps = {
  selectedSubForm: string;
};

export const RedirectToLayoutSet = ({ selectedSubForm }: RedirectToLayoutSetProps) => {
  const { setSelectedFormLayoutSetName } = useSelectedFormLayoutSetName();
  const { t } = useTranslation();

  const handleClickRedirect = () => {
    setSelectedFormLayoutSetName(selectedSubForm);
  };

  return (
    <RedirectBox
      title={t('ux_editor.component_properties.subform.go_to_layout_set')}
      className={classes.redirectContainer}
    >
      <StudioButton
        onClick={handleClickRedirect}
        variant='primary'
        color='second'
        icon={<PencilIcon />}
        iconPlacement='left'
      >
        {t('top_menu.create')}
      </StudioButton>
    </RedirectBox>
  );
};

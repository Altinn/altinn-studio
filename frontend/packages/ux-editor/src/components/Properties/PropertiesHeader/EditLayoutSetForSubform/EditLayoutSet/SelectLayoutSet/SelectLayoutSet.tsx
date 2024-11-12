import React from 'react';
import { StudioNativeSelect } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './SelectLayoutSet.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { SubformUtilsImpl } from '../../../../../../classes/SubformUtils';

type SelectLayoutSetProps = {
  setSelectedSubform: (layoutSetId: string) => void;
  selectedSubform: string;
};

export const SelectLayoutSet = ({ setSelectedSubform, selectedSubform }: SelectLayoutSetProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const subformUtils = new SubformUtilsImpl(layoutSets.sets);

  return (
    <StudioNativeSelect
      className={classes.layoutSetsOption}
      size='small'
      onChange={(e) => setSelectedSubform(e.target.value)}
      label={t('ux_editor.component_properties.subform.choose_layout_set_label')}
      value={selectedSubform}
    >
      <option value=''>{t('ux_editor.component_properties.subform.choose_layout_set')}</option>
      {subformUtils.subformLayoutSetsIds.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </StudioNativeSelect>
  );
};

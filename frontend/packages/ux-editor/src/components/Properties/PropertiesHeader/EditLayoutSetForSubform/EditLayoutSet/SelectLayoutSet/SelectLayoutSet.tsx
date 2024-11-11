import React from 'react';
import { StudioNativeSelect } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './SelectLayoutSet.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { SubformUtilsImpl } from '../../../../../../classes/SubformUtils';
import cn from 'classnames';

type SelectLayoutSetProps = {
  existingLayoutSetForSubform: string;
  setSelectedSubform: (layoutSetId: string) => void;
};

export const SelectLayoutSet = ({
  existingLayoutSetForSubform,
  setSelectedSubform,
}: SelectLayoutSetProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const subformUtils = new SubformUtilsImpl(layoutSets.sets);

  return (
    <div
      className={cn(classes.selectLayoutSet, {
        [classes.selectLayoutSetwithPadding]: existingLayoutSetForSubform,
      })}
    >
      <StudioNativeSelect
        className={classes.layoutSetsOption}
        size='small'
        onChange={(e) => setSelectedSubform(e.target.value)}
        label={t('ux_editor.component_properties.subform.choose_layout_set_label')}
        defaultValue={existingLayoutSetForSubform}
      >
        <option value=''>{t('ux_editor.component_properties.subform.choose_layout_set')}</option>
        {subformUtils.subformLayoutSetsIds.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </StudioNativeSelect>
    </div>
  );
};

import React from 'react';
import classes from './PropertiesHeader.module.css';
import { formItemConfigs } from '../../../data/formItemConfig';
import { QuestionmarkDiamondIcon } from '@studio/icons';
import { StudioSectionHeader } from '@studio/components';

import { getComponentHelperTextByComponentType } from '../../../utils/language';
import { useTranslation } from 'react-i18next';
import { EditComponentIdRow } from './EditComponentIdRow';
import type { FormItem } from '../../../types/FormItem';

export type PropertiesHeaderProps = {
  form: FormItem;
  handleComponentUpdate: (component: FormItem) => void;
};

export const PropertiesHeader = ({
  form,
  handleComponentUpdate,
}: PropertiesHeaderProps): React.JSX.Element => {
  const { t } = useTranslation();

  const isUnknownInternalComponent: boolean = !formItemConfigs[form.type];
  const Icon = isUnknownInternalComponent
    ? QuestionmarkDiamondIcon
    : formItemConfigs[form.type]?.icon;

  return (
    <>
      <StudioSectionHeader
        icon={<Icon />}
        heading={{
          text: t(`ux_editor.component_title.${form.type}`),
          level: 2,
        }}
        helpText={{
          text: getComponentHelperTextByComponentType(form.type, t),
          title: t('ux_editor.component_help_text_general_title'),
        }}
      />
      <div className={classes.content}>
        <div className={classes.contentRow}>
          <EditComponentIdRow component={form} handleComponentUpdate={handleComponentUpdate} />
        </div>
      </div>
    </>
  );
};

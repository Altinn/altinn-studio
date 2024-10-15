import React from 'react';
import classes from './PropertiesHeader.module.css';
import { formItemConfigs } from '../../../data/formItemConfig';
import { QuestionmarkDiamondIcon } from '@studio/icons';
import { StudioSectionHeader } from '@studio/components';

import { getComponentHelperTextByComponentType } from '../../../utils/language';
import { useTranslation } from 'react-i18next';
import { EditComponentIdRow } from './EditComponentIdRow';
import type { FormItem } from '../../../types/FormItem';
import { ComponentType } from 'app-shared/types/ComponentType';
import { EditLayoutSetForSubform } from './EditLayoutSetForSubform';

export type PropertiesHeaderProps = {
  formItem: FormItem;
  handleComponentUpdate: (component: FormItem) => void;
};

export const PropertiesHeader = ({
  formItem,
  handleComponentUpdate,
}: PropertiesHeaderProps): React.JSX.Element => {
  const { t } = useTranslation();

  const isUnknownInternalComponent: boolean = !formItemConfigs[formItem.type];
  const Icon = isUnknownInternalComponent
    ? QuestionmarkDiamondIcon
    : formItemConfigs[formItem.type]?.icon;

  return (
    <>
      <StudioSectionHeader
        icon={<Icon />}
        heading={{
          text: t(`ux_editor.component_title.${formItem.type}`),
          level: 2,
        }}
        helpText={{
          text: getComponentHelperTextByComponentType(formItem.type, t),
          title: t('ux_editor.component_help_text_general_title'),
        }}
      />
      <div className={classes.content}>
        <EditComponentIdRow component={formItem} handleComponentUpdate={handleComponentUpdate} />
        {formItem.type === ComponentType.SubForm && (
          <EditLayoutSetForSubform
            component={formItem}
            handleComponentChange={handleComponentUpdate}
          />
        )}
      </div>
    </>
  );
};

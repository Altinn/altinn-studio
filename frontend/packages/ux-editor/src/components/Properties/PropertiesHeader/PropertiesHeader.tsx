import React from 'react';
import classes from './PropertiesHeader.module.css';
import { formItemConfigs } from '../../../data/formItemConfig';
import { QuestionmarkDiamondIcon } from '@studio/icons';
import { StudioAlert, StudioSectionHeader } from '@studio/components';
import { getComponentHelperTextByComponentType } from '../../../utils/language';
import { useTranslation } from 'react-i18next';
import { EditComponentIdRow } from './EditComponentIdRow';
import type { FormItem } from '../../../types/FormItem';
import { ComponentType } from 'app-shared/types/ComponentType';
import { EditLayoutSetForSubform } from './EditLayoutSetForSubform';
import { ComponentMainConfig } from './ComponentMainConfig';
import { HeaderMainConfig } from './HeaderMainConfig';
import { isComponentDeprecated } from '@altinn/ux-editor/utils/component';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

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

  const hideContentWhenSubformGuide =
    formItem.type === ComponentType.Subform && !formItem['layoutSet'];

  const displayMainConfigHeader =
    shouldDisplayFeature(FeatureFlag.MainConfig) || ComponentType.Summary === formItem.type;

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
      {isComponentDeprecated(formItem.type) && (
        <StudioAlert size='sm' className={classes.alertWrapper} severity='warning'>
          {t(`ux_editor.component_properties.deprecated.${formItem.type}`)}
        </StudioAlert>
      )}
      <div className={classes.mainContent}>
        {!hideContentWhenSubformGuide && displayMainConfigHeader && <HeaderMainConfig />}
        {formItem.type === ComponentType.Subform && (
          <EditLayoutSetForSubform
            component={formItem}
            handleComponentChange={handleComponentUpdate}
          />
        )}
        {!hideContentWhenSubformGuide && (
          <>
            <EditComponentIdRow
              component={formItem}
              handleComponentUpdate={handleComponentUpdate}
            />
            {
              <ComponentMainConfig
                component={formItem}
                handleComponentChange={handleComponentUpdate}
              />
            }
          </>
        )}
      </div>
    </>
  );
};

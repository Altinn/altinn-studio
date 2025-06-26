import React from 'react';
import classes from './PropertiesHeader.module.css';
import { formItemConfigs } from '../../../data/formItemConfig';
import { StudioAlert, StudioSectionHeader, StudioSpinner } from '@studio/components-legacy';
import { getComponentHelperTextByComponentType } from '../../../utils/language';
import { useTranslation } from 'react-i18next';
import { EditComponentIdRow } from './EditComponentIdRow';
import type { FormItem } from '../../../types/FormItem';
import { ComponentType } from 'app-shared/types/ComponentType';
import { EditLayoutSetForSubform } from './EditLayoutSetForSubform';
import { ComponentMainConfig } from './ComponentMainConfig';
import { HeaderMainConfig } from './HeaderMainConfig';
import { isComponentDeprecated } from '@altinn/ux-editor/utils/component';
import { useComponentSchemaQuery } from '@altinn/ux-editor/hooks/queries/useComponentSchemaQuery';
import { TextMainConfig } from './TextMainConfig';
import { DataModelMainConfig } from './DataModelMainConfig';

export type PropertiesHeaderProps = {
  formItem: FormItem;
  handleComponentUpdate: (component: FormItem) => void;
};

export const PropertiesHeader = ({
  formItem,
  handleComponentUpdate,
}: PropertiesHeaderProps): React.JSX.Element => {
  const { t } = useTranslation();
  const { data: schema, isPending } = useComponentSchemaQuery(formItem.type);

  if (isPending) {
    return (
      <StudioSpinner
        showSpinnerTitle
        spinnerTitle={t('ux_editor.properties_panel.texts.loading')}
      />
    );
  }

  const { dataModelBindings, textResourceBindings } = schema.properties;

  const Icon = formItemConfigs[formItem.type]?.icon;

  const hideMainConfig = formItem.type === ComponentType.Subform && !formItem['layoutSet'];

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
        {formItem.type === ComponentType.Subform && (
          <EditLayoutSetForSubform
            component={formItem}
            handleComponentChange={handleComponentUpdate}
          />
        )}
        {!hideMainConfig && <HeaderMainConfig />}
        {!hideMainConfig && (
          <>
            <EditComponentIdRow
              component={formItem}
              handleComponentUpdate={handleComponentUpdate}
            />
            <TextMainConfig
              component={formItem}
              handleComponentChange={handleComponentUpdate}
              componentSchemaTextKeys={Object.keys(textResourceBindings?.properties || {})}
            />
            <DataModelMainConfig
              component={formItem}
              handleComponentChange={handleComponentUpdate}
              requiredDataModelBindings={dataModelBindings?.required || []}
            />
            <ComponentMainConfig
              component={formItem}
              handleComponentChange={handleComponentUpdate}
            />
          </>
        )}
      </div>
    </>
  );
};

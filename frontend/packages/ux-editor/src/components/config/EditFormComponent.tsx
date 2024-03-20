import React from 'react';
import type { EditSettings, IGenericEditComponent } from './componentConfig';
import { configComponents, componentSpecificEditConfig } from './componentConfig';

import { ComponentSpecificContent } from './componentSpecificContent';
import { Switch, Fieldset } from '@digdir/design-system-react';
import classes from './EditFormComponent.module.css';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { StudioSpinner } from '@studio/components';
import { FormComponentConfig } from './FormComponentConfig';
import { useTranslation } from 'react-i18next';
import {
  addFeatureFlagToLocalStorage,
  removeFeatureFlagFromLocalStorage,
  shouldDisplayFeature,
} from 'app-shared/utils/featureToggleUtils';
import { FormField } from 'app-shared/components/FormField';
import { formItemConfigs } from '../../data/formItemConfig';
import { UnknownComponentAlert } from '../UnknownComponentAlert';
import type { FormItem } from '../../types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { useSelectedLayoutName } from '../../hooks';

export interface IEditFormComponentProps<T extends ComponentType = ComponentType> {
  editFormId: string;
  component: FormItem<T>;
  handleComponentUpdate: (component: FormItem<T>) => void;
}

export const EditFormComponent = ({
  editFormId,
  component,
  handleComponentUpdate,
}: IEditFormComponentProps) => {
  const { selectedLayoutName } = useSelectedLayoutName();
  const { t } = useTranslation();
  const [showComponentConfigBeta, setShowComponentConfigBeta] = React.useState<boolean>(
    shouldDisplayFeature('componentConfigBeta'),
  );
  const formItemConfig = formItemConfigs[component.type];

  const { data: schema, isPending } = useComponentSchemaQuery(component.type);

  const renderFromComponentSpecificDefinition = (configDef: EditSettings[]) => {
    if (!configDef) return null;
    return configDef.map((configType) => {
      const Tag = configComponents[configType];
      if (!Tag) return null;
      return React.createElement<IGenericEditComponent>(Tag, {
        key: configType,
        editFormId,
        handleComponentChange: handleComponentUpdate,
        component,
      });
    });
  };

  const getConfigDefinitionForComponent = (): EditSettings[] => {
    return componentSpecificEditConfig[component.type];
  };

  const toggleShowBetaFunc = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowComponentConfigBeta(event.target.checked);
    // Ensure choice of feature toggling is persisted in local storage
    if (event.target.checked) {
      addFeatureFlagToLocalStorage('componentConfigBeta');
    } else {
      removeFeatureFlagFromLocalStorage('componentConfigBeta');
    }
  };

  const isUnknownInternalComponent: boolean = !formItemConfig;
  if (isUnknownInternalComponent) {
    return <UnknownComponentAlert componentName={component.type} />;
  }

  return (
    <Fieldset className={classes.root} legend=''>
      <FormField
        id={component.id}
        value={showComponentConfigBeta || false}
        onChange={toggleShowBetaFunc}
        propertyPath={formItemConfig.propertyPath}
        componentType={component.type}
        helpText={t('ux_editor.edit_component.show_beta_func_help_text')}
        renderField={({ fieldProps }) => (
          <Switch {...fieldProps} checked={fieldProps.value} size='small'>
            {t('ux_editor.edit_component.show_beta_func')}
          </Switch>
        )}
      />
      {showComponentConfigBeta && isPending && (
        <StudioSpinner
          showSpinnerTitle
          spinnerTitle={t('ux_editor.edit_component.loading_schema')}
        />
      )}
      {showComponentConfigBeta && !isPending && (
        <FormComponentConfig
          schema={schema}
          component={component}
          editFormId={editFormId}
          handleComponentUpdate={handleComponentUpdate}
        />
      )}
      {!showComponentConfigBeta && (
        <>
          {renderFromComponentSpecificDefinition(getConfigDefinitionForComponent())}
          <ComponentSpecificContent
            component={component}
            handleComponentChange={handleComponentUpdate}
            layoutName={selectedLayoutName}
          />
        </>
      )}
    </Fieldset>
  );
};

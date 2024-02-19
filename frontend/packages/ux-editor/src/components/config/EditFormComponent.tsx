import React from 'react';
import type { EditSettings, IGenericEditComponent } from './componentConfig';
import { configComponents } from './componentConfig';
import { componentSpecificEditConfig } from './componentConfig';
import { ComponentSpecificContent } from './componentSpecificContent';
import { Switch, Fieldset } from '@digdir/design-system-react';
import classes from './EditFormComponent.module.css';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { StudioSpinner } from '@studio/components';
import { FormComponentConfig } from './FormComponentConfig';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  addFeatureFlagToLocalStorage,
  removeFeatureFlagFromLocalStorage,
  shouldDisplayFeature,
} from 'app-shared/utils/featureToggleUtils';
import { FormField } from 'app-shared/components/FormField';
import { formItemConfigs } from '../../data/formItemConfig';
import { UnknownComponentAlert } from '../UnknownComponentAlert';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../types/FormItem';
import { RepeatingGroupComponent } from './componentSpecificContent/RepeatingGroup';

export interface IEditFormComponentProps {
  editFormId: string;
  component: FormItem;
  handleComponentUpdate: (component: FormItem) => void;
}

export const EditFormComponent = ({
  editFormId,
  component,
  handleComponentUpdate,
}: IEditFormComponentProps) => {
  const selectedLayout = useSelector(selectedLayoutNameSelector);
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
    <>
      {component.type === ComponentType.RepeatingGroup ? (
        <RepeatingGroupComponent
          editFormId={editFormId}
          component={component}
          handleComponentUpdate={handleComponentUpdate}
        />
      ) : (
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
            <StudioSpinner spinnerText={t('general.loading')} />
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
                layoutName={selectedLayout}
              />
            </>
          )}
        </Fieldset>
      )}
    </>
  );
};

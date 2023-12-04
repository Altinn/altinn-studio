import React from 'react';
import { configComponents, EditSettings, IGenericEditComponent } from './componentConfig';
import { componentSpecificEditConfig } from './componentConfig';
import { ComponentSpecificContent } from './componentSpecificContent';
import { Switch, Fieldset, Heading } from '@digdir/design-system-react';
import classes from './EditFormComponent.module.css';
import type { FormComponent } from '../../types/FormComponent';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { StudioSpinner } from '@studio/components';
import { FormComponentConfig } from './FormComponentConfig';
import { EditComponentId } from './editModal/EditComponentId';
import { useLayoutSchemaQuery } from '../../hooks/queries/useLayoutSchemaQuery';
import { useSelector } from 'react-redux';
import { getComponentTitleByComponentType } from '../../utils/language';
import { useTranslation } from 'react-i18next';
import {
  addFeatureFlagToLocalStorage,
  removeFeatureFlagFromLocalStorage,
  shouldDisplayFeature,
} from 'app-shared/utils/featureToggleUtils';
import { FormField } from 'app-shared/components/FormField';

export interface IEditFormComponentProps {
  editFormId: string;
  component: FormComponent;
  handleComponentUpdate: (component: FormComponent) => void;
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

  useLayoutSchemaQuery(); // Ensure we load the layout schemas so that component schemas can be loaded
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

  return (
    <Fieldset className={classes.root}>
      <FormField
        id={component.id}
        value={showComponentConfigBeta || false}
        onChange={toggleShowBetaFunc}
        propertyPath={component.propertyPath}
        componentType={component.type}
        helpText={t('ux_editor.edit_component.show_beta_func_helptext')}
        renderField={({ fieldProps }) => (
          <Switch {...fieldProps} checked={fieldProps.value} size='small'>
            {t('ux_editor.edit_component.show_beta_func')}
          </Switch>
        )}
      />
      <Heading level={2} size='xsmall'>
        {getComponentTitleByComponentType(component.type, t)} ({component.type})
      </Heading>
      {showComponentConfigBeta && isPending && <StudioSpinner spinnerText={t('general.loading')} />}
      {showComponentConfigBeta && !isPending && (
        <FormComponentConfig
          schema={isPending ? {} : schema}
          component={component}
          editFormId={editFormId}
          handleComponentUpdate={handleComponentUpdate}
        />
      )}
      {!showComponentConfigBeta && (
        <>
          <EditComponentId component={component} handleComponentUpdate={handleComponentUpdate} />
          {renderFromComponentSpecificDefinition(getConfigDefinitionForComponent())}
          <ComponentSpecificContent
            component={component}
            handleComponentChange={handleComponentUpdate}
            layoutName={selectedLayout}
          />
        </>
      )}
    </Fieldset>
  );
};

import React from 'react';
import type { EditSettings, IGenericEditComponent } from './componentConfig';
import { componentSpecificEditConfig, configComponents } from './componentConfig';

import { ComponentSpecificContent } from './componentSpecificContent';
import { Fieldset, Heading, Switch } from '@digdir/designsystemet-react';
import classes from './EditFormComponent.module.css';
import type { FormComponent } from '../../types/FormComponent';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { StudioSpinner } from 'libs/studio-components-legacy/src';
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
  FeatureFlag,
} from 'app-shared/utils/featureToggleUtils';
import { formItemConfigs } from '../../data/formItemConfig';
import { UnknownComponentAlert } from '../UnknownComponentAlert';

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
    shouldDisplayFeature(FeatureFlag.ComponentConfigBeta),
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
      addFeatureFlagToLocalStorage(FeatureFlag.ComponentConfigBeta);
    } else {
      removeFeatureFlagFromLocalStorage(FeatureFlag.ComponentConfigBeta);
    }
  };

  const isUnknownInternalComponent: boolean = !formItemConfigs[component.type];
  if (isUnknownInternalComponent) {
    return <UnknownComponentAlert componentName={component.type} />;
  }

  return (
    <Fieldset className={classes.root} legend=''>
      <Switch onChange={toggleShowBetaFunc} checked={showComponentConfigBeta} size='small'>
        {t('ux_editor.edit_component.show_beta_func')}
      </Switch>
      <Heading level={2} size='xsmall'>
        {getComponentTitleByComponentType(component.type, t)} ({component.type})
      </Heading>
      {showComponentConfigBeta && isPending && (
        <StudioSpinner
          showSpinnerTitle
          spinnerTitle={t('ux_editor.edit_component.loading_schema')}
        />
      )}
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

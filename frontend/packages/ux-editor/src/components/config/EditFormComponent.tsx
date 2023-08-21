import React, { useState } from 'react';
import { configComponents, EditSettings, IGenericEditComponent } from './componentConfig';
import { componentSpecificEditConfig } from './componentConfig';
import { ComponentSpecificContent } from './componentSpecificContent';
import { LegacyCheckbox, LegacyFieldSet, Heading } from '@digdir/design-system-react';
import classes from './EditFormComponent.module.css';
import type { FormComponent } from '../../types/FormComponent';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { AltinnSpinner } from 'app-shared/components';
import { FormComponentConfig } from './FormComponentConfig';
import { EditComponentId } from './editModal/EditComponentId';
import { useLayoutSchemaQuery } from '../../hooks/queries/useLayoutSchemaQuery';
import { useSelector } from 'react-redux';
import { getComponentTitleByComponentType } from '../../utils/language';
import { useTranslation } from 'react-i18next';

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
  const [showBetaFunc, setShowBetaFunc] = useState(false);
  useLayoutSchemaQuery(); // Ensure we load the layout schemas so that component schemas can be loaded
  const { data: schema, isLoading } = useComponentSchemaQuery(component.type);

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

  const toggleShowBetaFunc = () => {
    setShowBetaFunc(!showBetaFunc);
  };

  return (
    <LegacyFieldSet className={classes.root}>
      <LegacyCheckbox
        onChange={toggleShowBetaFunc}
        checked={showBetaFunc}
        label={t('ux_editor.edit_component.show_beta_func')}
        helpText={t('ux_editor.edit_component.show_beta_func_helptext')}
      />
      <Heading level={2} size='xsmall'>
        {getComponentTitleByComponentType(component.type, t)} ({component.type})
      </Heading>
      {showBetaFunc && isLoading && <AltinnSpinner spinnerText={t('general.loading')} />}
      {showBetaFunc && (
        <FormComponentConfig
          schema={isLoading ? {} : schema}
          component={component}
          editFormId={editFormId}
          handleComponentUpdate={handleComponentUpdate}
        />
      )}
      {!showBetaFunc && (
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
    </LegacyFieldSet>
  );
};

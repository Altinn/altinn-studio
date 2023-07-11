import React from 'react';
import { configComponents, EditSettings, IGenericEditComponent } from './componentConfig';
import { componentSpecificEditConfig } from './componentConfig';
import { ComponentSpecificContent } from './componentSpecificContent';
import { FieldSet, Heading } from '@digdir/design-system-react';
import classes from './EditFormComponent.module.css';
import type { FormComponent } from '../../types/FormComponent';
import { useFormLayoutsSelector } from '../../hooks';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { AltinnSpinner } from 'app-shared/components';
import { FormComponentConfig } from './FormComponentConfig';
import { EditComponentId } from './editModal/EditComponentId';
import { useLayoutSchemaQuery } from '../../hooks/queries/useLayoutSchemaQuery';

export interface IEditFormComponentProps {
  editFormId: string;
  component: FormComponent;
  handleComponentUpdate: (component: FormComponent) => void;
  isProd: boolean;
}

export const EditFormComponent = ({
  editFormId,
  component,
  isProd,
  handleComponentUpdate,
}: IEditFormComponentProps) => {
  const selectedLayout = useFormLayoutsSelector(selectedLayoutNameSelector);
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

  return (
    <FieldSet className={classes.root}>
      <Heading level={2} size='xsmall'>
        {component.type}
      </Heading>
      {!isProd && isLoading && <AltinnSpinner spinnerText='Loading...' />}
      {!isProd && (
        <>
          <FormComponentConfig
            schema={isLoading ? {} : schema}
            component={component}
            editFormId={editFormId}
            handleComponentUpdate={handleComponentUpdate}
          />
          <ComponentSpecificContent
            component={component}
            handleComponentChange={handleComponentUpdate}
            layoutName={selectedLayout}
            isProd={isProd}
          />
        </>
      )}
      {isProd && (
        <>
          <EditComponentId component={component} handleComponentUpdate={handleComponentUpdate} />
          {renderFromComponentSpecificDefinition(getConfigDefinitionForComponent())}
          <ComponentSpecificContent
            component={component}
            handleComponentChange={handleComponentUpdate}
            layoutName={selectedLayout}
            isProd={isProd}
          />
        </>
      )}
    </FieldSet>
  );
};

import React from 'react';
import type { EditSettings, IGenericEditComponent } from './componentConfig';
import { EditComponentId } from './editModal/EditComponentId';
import { componentSpecificEditConfig, configComponents } from './componentConfig';
import { ComponentSpecificContent } from './componentSpecificContent';
import { FieldSet } from '@digdir/design-system-react';
import classes from './EditFormComponent.module.css';
import type { FormComponent } from '../../types/FormComponent';
import { useFormLayoutsSelector } from '../../hooks/useFormLayoutsSelector';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { useComponentErrorMessage } from '../../hooks/useComponentErrorMessage';

export interface IEditFormComponentProps {
  component: FormComponent;
  handleComponentUpdate: React.Dispatch<React.SetStateAction<FormComponent>>;
}

export const EditFormComponent = ({
  component,
  handleComponentUpdate,
}: IEditFormComponentProps) => {
  const selectedLayout = useFormLayoutsSelector(selectedLayoutNameSelector);
  const errorMessage = useComponentErrorMessage(component);
  const renderFromComponentSpecificDefinition = (configDef: EditSettings[]) => {
    if (!configDef) return null;

    return configDef.map((configType) => {
      const Tag = configComponents[configType];
      if (!Tag) return null;
      return React.createElement<IGenericEditComponent>(Tag, {
        key: configType,
        handleComponentChange: handleComponentUpdate,
        component,
      });
    });
  };

  const getConfigDefinitionForComponent = (): EditSettings[] => {
    return componentSpecificEditConfig[component.type];
  };

  return (
    <FieldSet className={classes.root} error={errorMessage}>
      <EditComponentId component={component} handleComponentUpdate={handleComponentUpdate} />
      {renderFromComponentSpecificDefinition(getConfigDefinitionForComponent())}
      <ComponentSpecificContent
        component={component}
        handleComponentChange={handleComponentUpdate}
        layoutName={selectedLayout}
      />
    </FieldSet>
  );
};

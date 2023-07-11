import React from 'react';
import type { EditSettings, IGenericEditComponent } from './componentConfig';
import { EditComponentId } from './editModal/EditComponentId';
import { componentSpecificEditConfig, configComponents } from './componentConfig';
import { ComponentSpecificContent } from './componentSpecificContent';
import { FieldSet } from '@digdir/design-system-react';
import classes from './EditFormComponent.module.css';
import type { FormComponent } from '../../types/FormComponent';
import { useFormLayoutsSelector } from '../../hooks';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';

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
  const selectedLayout = useFormLayoutsSelector(selectedLayoutNameSelector);
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

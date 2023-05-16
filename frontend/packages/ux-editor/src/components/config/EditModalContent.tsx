import React from 'react';
import type { EditSettings, IGenericEditComponent } from './componentConfig';
import { ComponentType } from '../index';
import { EditComponentId } from './editModal/EditComponentId';
import { componentSpecificEditConfig, configComponents } from './componentConfig';
import { ComponentSpecificContent } from './componentSpecificContent';
import { FieldSet } from '@digdir/design-system-react';
import classes from './EditModalContent.module.css';
import type { FormComponent } from '../../types/FormComponent';
import { useFormLayoutsSelector } from '../../hooks/useFormLayoutsSelector';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { useComponentErrorMessage } from '../../hooks/useComponentErrorMessage';

export interface IEditModalContentProps {
  cancelEdit?: () => void;
  component: FormComponent;
  handleComponentUpdate?: (updatedComponent: FormComponent) => void;
  saveEdit?: (updatedComponent: FormComponent) => void;
  thirdPartyComponentConfig?: EditSettings[];
}

export const EditModalContent = ({
  component,
  handleComponentUpdate,
  thirdPartyComponentConfig,
}: IEditModalContentProps) => {
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
    if (component.type === ComponentType.ThirdParty) {
      return thirdPartyComponentConfig[component.tagName];
    }

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

import React from 'react';
import type { EditSettings, IGenericEditComponent } from './componentConfig';
import { configComponents, componentSpecificEditConfig } from './componentConfig';

import { ComponentSpecificContent } from './componentSpecificContent';
import { Fieldset } from '@digdir/design-system-react';
import classes from './EditFormComponent.module.css';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { useComponentSchemaQuery } from '../../hooks/queries/useComponentSchemaQuery';
import { StudioSpinner } from '@studio/components';
import { FormComponentConfig } from './FormComponentConfig';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { formItemConfigs } from '../../data/formItemConfig';
import { UnknownComponentAlert } from '../UnknownComponentAlert';
import type { FormItem } from '../../types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';

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
  const selectedLayout = useSelector(selectedLayoutNameSelector);
  const { t } = useTranslation();

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

  const isUnknownInternalComponent: boolean = !formItemConfig;
  if (isUnknownInternalComponent) {
    return <UnknownComponentAlert componentName={component.type} />;
  }

  return (
    <Fieldset className={classes.root} legend=''>
      {isPending && (
        <StudioSpinner
          showSpinnerTitle
          spinnerTitle={t('ux_editor.edit_component.loading_schema')}
        />
      )}
      {!isPending && (
        <FormComponentConfig
          schema={schema}
          component={component}
          editFormId={editFormId}
          handleComponentUpdate={handleComponentUpdate}
        />
      )}

      <>
        {renderFromComponentSpecificDefinition(getConfigDefinitionForComponent())}
        <ComponentSpecificContent
          component={component}
          handleComponentChange={handleComponentUpdate}
          layoutName={selectedLayout}
        />
      </>
    </Fieldset>
  );
};

import React from 'react';
import type { IGenericEditComponent } from '../../componentConfig';
import { ComponentType } from 'app-shared/types/ComponentType';
import {
  StudioCard,
  StudioNativeSelect,
  StudioParagraph,
  StudioTextfield,
} from '@studio/components';
import { useFormLayoutsQuery } from '../../../../hooks/queries/useFormLayoutsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../../../hooks';
import { useComponentTypeName } from '@altinn/ux-editor/hooks/useComponentTypeName';
import { useTranslation } from 'react-i18next';
import { Summmary2ComponentTargetSelector } from './Summary2ComponentTargetSelector';

export const Summary2Component = ({
  schema,
  component,
  handleComponentChange,
}: IGenericEditComponent<ComponentType.Summary2>) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, selectedFormLayoutName } = useAppContext();
  const { data: formLayoutsData } = useFormLayoutsQuery(org, app, selectedFormLayoutSetName);
  const componentTypeName = useComponentTypeName();

  const components = formLayoutsData[selectedFormLayoutName].components;
  const excludedComponents = [ComponentType.Summary2]; // TODO: Add components that should be excluded
  const filtered = Object.entries(components)
    .filter(([_, value]) => {
      return !excludedComponents.includes(value.type);
    })
    .map(([key, value]) => {
      return { id: key, description: componentTypeName(value.type) };
    });

  const pages = Object.entries(formLayoutsData).map(([key, value]) => {
    return { id: key, description: undefined };
  });

  const handleTypeChange = (e: any) => {
    const updatedComponent = { ...component };
    updatedComponent.target = { type: e.target.value };
    handleComponentChange(updatedComponent);
  };

  const handleTargetIdChange = (value: string) => {
    const updatedComponent = { ...component };
    updatedComponent.target.id = value;
    handleComponentChange(updatedComponent);
  };

  if (!schema?.properties) return null;
  const target = component.target;
  const targetTypes = schema.properties.target.properties.type.enum;

  return (
    <StudioCard>
      <StudioCard.Header>{t('ux_editor.component_properties.target')}</StudioCard.Header>
      <StudioParagraph size='small'>
        {t('ux_editor.component_properties.target_description')}
      </StudioParagraph>
      <StudioCard.Content>
        <StudioNativeSelect
          size='sm'
          label={t('ux_editor.component_properties.target_type')}
          value={target.type}
          onChange={handleTypeChange}
        >
          {targetTypes.map((typeString: string) => (
            <option key={typeString} value={typeString}>
              {typeString}
            </option>
          ))}
        </StudioNativeSelect>
        {target.type === 'page' && (
          <Summmary2ComponentTargetSelector
            label={t('general.page')}
            value={target.id}
            options={pages}
            onValueChange={handleTargetIdChange}
          ></Summmary2ComponentTargetSelector>
        )}
        {target.type === 'component' && (
          <Summmary2ComponentTargetSelector
            label={t('general.component')}
            value={target.id}
            options={components}
            onValueChange={handleTargetIdChange}
          ></Summmary2ComponentTargetSelector>
        )}
        {target.type === 'layoutSet' && (
          <StudioTextfield
            size='small'
            label={t('general.layout_sets')}
            value={selectedFormLayoutSetName}
            disabled={true}
          />
        )}
      </StudioCard.Content>
    </StudioCard>
  );
};

/**
 * Added translation keys
 * ux_editor.component_properties.target_description
 * ux_editor.component_properties.target_type
 */

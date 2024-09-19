import React from 'react';
import type { IGenericEditComponent } from '../../componentConfig';
import { ComponentType } from 'app-shared/types/ComponentType';
import {
  StudioCard,
  StudioCombobox,
  StudioNativeSelect,
  StudioParagraph,
  StudioTextfield,
} from '@studio/components';
import { useFormLayoutsQuery } from '../../../../hooks/queries/useFormLayoutsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../../../hooks';
import { useComponentTypeName } from '@altinn/ux-editor/hooks/useComponentTypeName';
import { useTranslation } from 'react-i18next';

export function Summary2Component({
  schema,
  component,
  handleComponentChange,
}: IGenericEditComponent<ComponentType.Summary2>) {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, selectedFormLayoutName } = useAppContext();
  const { data: formLayoutsData } = useFormLayoutsQuery(org, app, selectedFormLayoutSetName);
  const componentTypeName = useComponentTypeName();

  const components = formLayoutsData[selectedFormLayoutName].components;
  const excludedComponents = [ComponentType.Summary2]; // TODO: Add components that should be excluded
  const filtered = Object.entries(components).filter(([key, value]) => {
    return excludedComponents.includes(value.type);
  });

  const pages = Object.entries(formLayoutsData);

  const handleTypeChange = (e: any) => {
    const updatedComponent = { ...component };
    updatedComponent.target = { type: e.target.value };
    handleComponentChange(updatedComponent);
  };

  const handleTargetIdChange = (value: string[]) => {
    const updatedComponent = { ...component };
    updatedComponent.target.id = value[0];
    handleComponentChange(updatedComponent);
  };

  if (!schema?.properties) return null;
  const targetSchema = schema.properties.target.properties;
  const targetProperties = component.target;
  return (
    <StudioCard>
      {/** TODO: Add translation **/}
      <StudioCard.Header>{t('ux_editor.component_properties.target')}</StudioCard.Header>
      {/** TODO: Add translation **/}
      <StudioParagraph size='small'>Target of the summary component</StudioParagraph>
      <StudioCard.Content>
        <StudioNativeSelect
          size='small'
          label='Type' // TODO: Add translation
          value={targetProperties.type}
          onChange={handleTypeChange}
        >
          {targetSchema.type.enum.map((typeString: string) => (
            <option key={typeString} value={typeString}>
              {typeString}
            </option>
          ))}
        </StudioNativeSelect>
        {targetProperties.type === 'page' && (
          <StudioCombobox
            size='small'
            label='page' // TODO: Add translation
            value={targetProperties.id ? [targetProperties.id] : []}
            onValueChange={handleTargetIdChange}
            multiple={false}
          >
            {pages.map(([pageId, _pageDetails]) => (
              <StudioCombobox.Option value={pageId} key={pageId}>
                {pageId}
              </StudioCombobox.Option>
            ))}
          </StudioCombobox>
        )}
        {targetProperties.type === 'component' && (
          <StudioCombobox
            size='small'
            label='component' // TODO: Add translation
            value={targetProperties.id ? [targetProperties.id] : []}
            onValueChange={handleTargetIdChange}
            multiple={false}
          >
            {filtered.map(([componentId, componentDetails]) => (
              <StudioCombobox.Option
                value={componentId}
                key={componentId}
                description={componentTypeName(componentDetails.type)}
              >
                {componentId}
              </StudioCombobox.Option>
            ))}
          </StudioCombobox>
        )}
        {targetProperties.type === 'layoutSet' && (
          <StudioTextfield
            size='small'
            label='layoutSet' // TODO: Add translation
            value={selectedFormLayoutSetName}
            disabled={true}
          />
        )}
      </StudioCard.Content>
    </StudioCard>
  );
}

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
  const targetSchema = schema.properties.target.properties;
  const targetProperties = component.target;
  return (
    <StudioCard>
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
          <Summmary2ComponentTargetId
            label='page'
            value={targetProperties.id}
            options={pages}
            onValueChange={handleTargetIdChange}
          ></Summmary2ComponentTargetId>
        )}
        {targetProperties.type === 'component' && (
          <Summmary2ComponentTargetId
            label='component'
            value={targetProperties.id}
            options={filtered}
            onValueChange={handleTargetIdChange}
          ></Summmary2ComponentTargetId>
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
};

type Summary2ComponentTargetIdProps = {
  label: string;
  value: string;
  options: { id: string; description: string }[];
  onValueChange: (value: string) => void;
};

const Summmary2ComponentTargetId = ({
  label,
  value,
  options,
  onValueChange,
}: Summary2ComponentTargetIdProps) => {
  const invalidOption = Boolean(value) && !options.some((option) => option.id === value);
  return (
    <StudioCombobox
      size='small'
      label={label}
      value={value ? [value] : []}
      onValueChange={(v) => onValueChange(v[0])}
      error={invalidOption} // TODO: Add error message
      multiple={false}
    >
      {options.map((option) => (
        <StudioCombobox.Option value={option.id} key={option.id} description={option.description}>
          {option.id}
        </StudioCombobox.Option>
      ))}
      {value && invalidOption && (
        <StudioCombobox.Option disabled value={value} key={value}>
          {value}
        </StudioCombobox.Option>
      )}
    </StudioCombobox>
  );
};

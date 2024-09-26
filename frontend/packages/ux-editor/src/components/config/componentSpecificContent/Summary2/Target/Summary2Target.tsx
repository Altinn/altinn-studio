import { Summmary2ComponentReferenceSelector } from '../Summary2ComponentReferenceSelector';
import {
  StudioCard,
  StudioHeading,
  StudioParagraph,
  StudioNativeSelect,
  StudioTextfield,
} from '@studio/components';
import React from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type {
  Summary2TargetConfig,
  SummaryTargetType,
} from 'app-shared/types/ComponentSpecificConfig';
import { ComponentType } from 'app-shared/types/ComponentType';
import { useTranslation } from 'react-i18next';
import type { FormComponent } from '../../../../../types/FormComponent';
import { useAppContext, useComponentTypeName } from '../../../../../hooks';
import { useFormLayoutsQuery } from '../../../../../hooks/queries/useFormLayoutsQuery';
import { getAllLayoutComponents } from '../../../../../utils/formLayoutUtils';

type Summary2TargetProps = {
  target: Summary2TargetConfig;
  onChange: (target: Summary2TargetConfig) => void;
};

export const Summary2Target = ({ target, onChange }: Summary2TargetProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, selectedFormLayoutName } = useAppContext();
  const { data: formLayoutsData } = useFormLayoutsQuery(org, app, selectedFormLayoutSetName);
  const componentTypeName = useComponentTypeName();

  const excludedComponents = [
    ComponentType.Summary2,
    ComponentType.NavigationButtons,
    ComponentType.NavigationBar,
  ];
  const components = Object.values(formLayoutsData).flatMap((layout) =>
    getAllLayoutComponents(layout, excludedComponents),
  );
  const componentOptions = components.map((formComponent: FormComponent) => ({
    id: formComponent.id,
    description: componentTypeName(formComponent.type),
  }));

  const pageOptions = Object.keys(formLayoutsData).map((page) => ({
    id: page,
    description: undefined,
  }));

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = event.target.value as SummaryTargetType;
    const updatedTarget = { type: newType, id: '' };
    // set default value for page
    if (newType === 'page' && pageOptions.some((page) => page.id === selectedFormLayoutName)) {
      updatedTarget.id = selectedFormLayoutName;
    }
    onChange(updatedTarget);
  };

  const handleTargetIdChange = (value: string) => {
    const updatedTarget = { ...target };
    updatedTarget.id = value;
    onChange(updatedTarget);
  };

  const targetTypes = [
    { value: 'page', label: t('general.page') },
    { value: 'component', label: t('general.component') },
    { value: 'layoutSet', label: t('general.layout_set') },
  ];
  return (
    <StudioCard>
      <StudioCard.Header>
        <StudioHeading size='2xs'>{t('ux_editor.component_properties.target')}</StudioHeading>
      </StudioCard.Header>
      <StudioParagraph size='sm'>
        {t('ux_editor.component_properties.target_description')}
      </StudioParagraph>
      <StudioCard.Content>
        <StudioNativeSelect
          size='sm'
          label={t('ux_editor.component_properties.target_type')}
          value={target.type}
          onChange={handleTypeChange}
        >
          {targetTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </StudioNativeSelect>
        {target.type === 'page' && (
          <Summmary2ComponentReferenceSelector
            label={t('general.page')}
            value={target.id}
            options={pageOptions}
            onValueChange={handleTargetIdChange}
          />
        )}
        {target.type === 'component' && (
          <Summmary2ComponentReferenceSelector
            label={t('general.component')}
            value={target.id}
            options={componentOptions}
            onValueChange={handleTargetIdChange}
          ></Summmary2ComponentReferenceSelector>
        )}
        {target.type === 'layoutSet' && (
          <StudioTextfield
            size='sm'
            label={t('general.layout_set')}
            value={selectedFormLayoutSetName}
            disabled={true}
          />
        )}
      </StudioCard.Content>
    </StudioCard>
  );
};

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
import { getAllLayoutComponents } from '../../../../utils/formLayoutUtils';

export const Summary2Component = ({
  component,
  handleComponentChange,
}: IGenericEditComponent<ComponentType.Summary2>) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, selectedFormLayoutName } = useAppContext();
  const { data: formLayoutsData } = useFormLayoutsQuery(org, app, selectedFormLayoutSetName);
  const componentTypeName = useComponentTypeName();

  const excludedComponents = [
    ComponentType.Summary2,
    ComponentType.NavigationButtons,
    ComponentType.NavigationBar,
  ]; // TODO: Add more components that should be excluded

  const components = Object.values(formLayoutsData).flatMap((layout) => {
    return getAllLayoutComponents(layout, excludedComponents).map((e) => {
      return { id: e.id, description: componentTypeName(e.type) };
    });
  });

  const pages = Object.keys(formLayoutsData).map((page) => {
    return { id: page, description: undefined };
  });

  const handleTypeChange = (e: any) => {
    const newType = e.target.value;
    const updatedComponent = { ...component };

    updatedComponent.target = { type: newType };
    // set default value for page
    if (newType === 'page' && pages.some((page) => page.id === selectedFormLayoutName)) {
      updatedComponent.target.id = selectedFormLayoutName;
    }
    handleComponentChange(updatedComponent);
  };

  const handleTargetIdChange = (value: string) => {
    const updatedComponent = { ...component };

    updatedComponent.target.id = value;
    handleComponentChange(updatedComponent);
  };

  const target = component.target;
  const targetTypes = [
    { value: 'page', label: t('general.page') },
    { value: 'component', label: t('general.component') },
    { value: 'layoutSet', label: t('general.layout_set') },
  ];

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
          {targetTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
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
            label={t('general.layout_set')}
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
 * ux_editor.component_properties.target_invalid
 */

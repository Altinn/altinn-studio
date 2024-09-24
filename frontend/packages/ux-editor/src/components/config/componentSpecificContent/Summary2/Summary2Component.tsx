import React from 'react';
import type { IGenericEditComponent } from '../../componentConfig';
import { ComponentType } from 'app-shared/types/ComponentType';
import {
  StudioButton,
  StudioCard,
  StudioHeading,
  StudioNativeSelect,
  StudioParagraph,
  StudioTextfield,
} from '@studio/components';
import { useFormLayoutsQuery } from '../../../../hooks/queries/useFormLayoutsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext, useComponentTypeName } from '../../../../hooks';
import { useTranslation } from 'react-i18next';
import { Summmary2ComponentTargetSelector } from './Summary2ComponentTargetSelector';
import { getAllLayoutComponents } from '../../../../utils/formLayoutUtils';
import type {
  SummaryTargetType,
  Summary2OverrideConfig,
} from 'app-shared/types/ComponentSpecificConfig';
import type { FormComponent } from '../../../../types/FormComponent';
import { Summary2Override } from './Override/Summary2Override';
import { Divider } from '@digdir/designsystemet-react';

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
  ];
  // TODO: This list of components to exclude when listing targets
  // is not complete. Add more components that should be excluded
  // as part of https://github.com/Altinn/altinn-studio/issues/13528

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
    const updatedComponent = { ...component };

    updatedComponent.target = { type: newType };
    // set default value for page
    if (newType === 'page' && pageOptions.some((page) => page.id === selectedFormLayoutName)) {
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

  const overrides: Summary2OverrideConfig[] = component.overrides;

  const addOverride = (): void => {
    const updatedComponent = { ...component };
    updatedComponent.overrides = updatedComponent.overrides || [];
    updatedComponent.overrides.push({ componentId: '' });
    handleComponentChange(updatedComponent);
  };

  const onChangeOverride =
    (index: number): ((override: any) => void) =>
    (override: any) => {
      const updatedComponent = { ...component };
      updatedComponent.overrides[index] = override;
      handleComponentChange(updatedComponent);
    };

  const onDeleteOverride =
    (index: number): (() => void) =>
    () => {
      const updatedComponent = { ...component };
      updatedComponent.overrides.splice(index, 1);
      handleComponentChange(updatedComponent);
    };

  return (
    <>
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
            <Summmary2ComponentTargetSelector
              label={t('general.page')}
              value={target.id}
              options={pageOptions}
              onValueChange={handleTargetIdChange}
            />
          )}
          {target.type === 'component' && (
            <Summmary2ComponentTargetSelector
              label={t('general.component')}
              value={target.id}
              options={componentOptions}
              onValueChange={handleTargetIdChange}
            ></Summmary2ComponentTargetSelector>
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
      <StudioCard>
        <StudioCard.Header>
          <StudioHeading size='2xs'>{t('ux_editor.component_properties.overrides')}</StudioHeading>
        </StudioCard.Header>
        <StudioParagraph size='sm'>
          {t('ux_editor.component_properties.overrides_description')}
        </StudioParagraph>
        <StudioCard.Content>
          {overrides &&
            overrides.map((override, index) => (
              <>
                <Divider></Divider>
                <Summary2Override
                  override={override}
                  key={index}
                  onChange={onChangeOverride(index)}
                  onDelete={onDeleteOverride(index)}
                ></Summary2Override>
              </>
            ))}
          <StudioButton size='sm' variant='primary' onClick={addOverride}>
            {t('ux_editor.component_properties.summary.add_override')}
          </StudioButton>
        </StudioCard.Content>
      </StudioCard>
    </>
  );
};

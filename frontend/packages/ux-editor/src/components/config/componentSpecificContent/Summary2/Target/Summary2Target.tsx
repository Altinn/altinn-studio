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
import { useTranslation } from 'react-i18next';
import { useAppContext, useComponentTitle } from '../../../../../hooks';
import { useFormLayoutsQuery } from '../../../../../hooks/queries/useFormLayoutsQuery';
import { useTargetTypes } from './useTargetTypes';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { getComponentOptions, getLayoutSetOptions, getPageOptions } from './targetUtils';

type Summary2TargetProps = {
  target: Summary2TargetConfig;
  onChange: (target: Summary2TargetConfig) => void;
};

export const Summary2Target = ({ target, onChange }: Summary2TargetProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, selectedFormLayoutName } = useAppContext();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const selectedLayoutSetTargetName = target.taskId
    ? layoutSets?.sets?.find((set) => set.tasks?.[0] === target.taskId).id
    : selectedFormLayoutSetName;
  const { data: formLayoutsData } = useFormLayoutsQuery(org, app, selectedLayoutSetTargetName);
  const getComponentTitle = useComponentTitle();
  const targetTypes = useTargetTypes();

  const layoutSetOptions = getLayoutSetOptions(layoutSets);
  const pageOptions = getPageOptions(formLayoutsData);
  const componentOptions = getComponentOptions({ formLayoutsData, getComponentTitle });

  const handleLayoutSetChange = (layoutSetName: string) => {
    const taskId = layoutSets.sets.find((set) => set.id === layoutSetName).tasks[0];
    const updatedTarget = { ...target, id: '', taskId };
    onChange(updatedTarget);
  };

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = event.target.value as SummaryTargetType;
    const updatedTarget = { ...target, type: newType, id: '' };
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
          label={t('ux_editor.component_properties.target_layoutSet_id')}
          value={selectedLayoutSetTargetName}
          onChange={(e) => handleLayoutSetChange(e.target.value)}
        >
          {layoutSetOptions.map((layoutSet) => (
            <option key={layoutSet.id} value={layoutSet.id}>
              {layoutSet.id}
            </option>
          ))}
        </StudioNativeSelect>
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
            key={target.id} // TODO: Remove the key when https://github.com/digdir/designsystemet/issues/2264 is fixed
            label={t('ux_editor.component_properties.target_unit_page')}
            value={target.id}
            options={pageOptions}
            onValueChange={handleTargetIdChange}
          />
        )}
        {target.type === 'component' && (
          <Summmary2ComponentReferenceSelector
            key={target.id} // TODO: Remove the key when https://github.com/digdir/designsystemet/issues/2264 is fixed
            label={t('ux_editor.component_properties.target_unit_component')}
            value={target.id}
            options={componentOptions}
            onValueChange={handleTargetIdChange}
          ></Summmary2ComponentReferenceSelector>
        )}
        {target.type === 'layoutSet' && (
          <StudioTextfield
            key={target.id} // TODO: Remove the key when https://github.com/digdir/designsystemet/issues/2264 is fixed
            size='sm'
            label={t('ux_editor.component_properties.target_unit_layout_set')}
            value={selectedLayoutSetTargetName}
            disabled={true}
          />
        )}
      </StudioCard.Content>
    </StudioCard>
  );
};

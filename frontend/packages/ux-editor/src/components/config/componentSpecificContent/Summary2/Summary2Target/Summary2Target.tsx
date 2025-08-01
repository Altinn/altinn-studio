import { Summary2ComponentReferenceSelector } from '../Summary2ComponentReferenceSelector';
import { StudioHeading, StudioNativeSelect, StudioTextfield } from '@studio/components-legacy';
import { StudioParagraph } from '@studio/components';
import React from 'react';
import classes from './Summary2Target.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type {
  Summary2TargetConfig,
  SummaryTargetType,
} from 'app-shared/types/ComponentSpecificConfig';
import { useTranslation } from 'react-i18next';
import { useAppContext, useComponentTitle } from '../../../../../hooks';
import { useFormLayoutsQuery } from '../../../../../hooks/queries/useFormLayoutsQuery';
import { useTargetTypes } from './useTargetTypes';
import {
  getComponentOptions,
  getLayoutSetOptions,
  getPageOptions,
  getTargetLayoutSetName,
} from './targetUtils';
import { useLayoutSetsExtendedQuery } from 'app-shared/hooks/queries/useLayoutSetsExtendedQuery';
import cn from 'classnames';

type Summary2TargetProps = {
  target: Summary2TargetConfig;
  onChange: (target: Summary2TargetConfig) => void;
  className?: string;
};

export const Summary2Target = ({ target, onChange, className }: Summary2TargetProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, selectedFormLayoutName } = useAppContext();
  const { data: layoutSets } = useLayoutSetsExtendedQuery(org, app);
  const selectedLayoutSetTargetName = getTargetLayoutSetName({
    target,
    layoutSets,
    selectedFormLayoutSetName,
  });
  const { data: formLayoutsData } = useFormLayoutsQuery(org, app, selectedLayoutSetTargetName);
  const getComponentTitle = useComponentTitle();
  const targetTypes = useTargetTypes();

  const layoutSetOptions = getLayoutSetOptions(layoutSets);
  const pageOptions = getPageOptions(formLayoutsData);
  const componentOptions = getComponentOptions({ formLayoutsData, getComponentTitle });

  const handleLayoutSetChange = (taskId: string) => {
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
    <div className={cn(className ? className : classes.targetConfig, classes.wrapperConfig)}>
      <StudioHeading size='2xs'>{t('ux_editor.component_properties.target')}</StudioHeading>
      <StudioParagraph spacing>
        {t('ux_editor.component_properties.target_description')}
      </StudioParagraph>
      <StudioNativeSelect
        size='sm'
        label={t('ux_editor.component_properties.target_layoutSet_id')}
        value={target.taskId}
        onChange={(e) => handleLayoutSetChange(e.target.value)}
      >
        {layoutSetOptions.map((layoutSet) => (
          <option
            key={layoutSet.id}
            value={layoutSet.id === selectedFormLayoutSetName ? '' : layoutSet.task.id}
          >
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
        <Summary2ComponentReferenceSelector
          key={target.id} // TODO: Remove the key when https://github.com/digdir/designsystemet/issues/2264 is fixed
          label={t('ux_editor.component_properties.target_unit_page')}
          value={target.id}
          options={pageOptions}
          onValueChange={handleTargetIdChange}
        />
      )}
      {target.type === 'component' && (
        <Summary2ComponentReferenceSelector
          key={target.id} // TODO: Remove the key when https://github.com/digdir/designsystemet/issues/2264 is fixed
          label={t('ux_editor.component_properties.target_unit_component')}
          value={target.id}
          options={componentOptions}
          onValueChange={handleTargetIdChange}
        />
      )}
      {target.type === 'layoutSet' && (
        <StudioTextfield
          key={target.id} // TODO: Remove the key when https://github.com/digdir/designsystemet/issues/2264 is fixed
          label={t('ux_editor.component_properties.target_unit_layout_set')}
          value={selectedLayoutSetTargetName}
          disabled={true}
        />
      )}
    </div>
  );
};

import React, { useEffect } from 'react';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useText, useAppContext } from '../../hooks';
import classes from './LayoutSetsContainer.module.css';
import { ExportForm } from './ExportForm';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { SubFormWrapper } from './SubForm/SubFormWrapper';
import { StudioCombobox } from '@studio/components';

export function LayoutSetsContainer() {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSetsResponse } = useLayoutSetsQuery(org, app);
  const layoutSets = layoutSetsResponse?.sets;
  const t = useText();
  const {
    selectedFormLayoutSetName,
    setSelectedFormLayoutSetName,
    setSelectedFormLayoutName,
    refetchLayouts,
    refetchLayoutSettings,
    onLayoutSetNameChange,
  } = useAppContext();

  useEffect(() => {
    onLayoutSetNameChange(selectedFormLayoutSetName);
  }, [onLayoutSetNameChange, selectedFormLayoutSetName]);

  if (!layoutSets) return null;

  const handleLayoutSetChange = async (layoutSetName: string) => {
    if (selectedFormLayoutSetName !== layoutSetName && layoutSetName) {
      await refetchLayouts(layoutSetName);
      await refetchLayoutSettings(layoutSetName);

      setSelectedFormLayoutSetName(layoutSetName);
      setSelectedFormLayoutName(undefined);
      onLayoutSetNameChange(layoutSetName);
    }
  };

  return (
    <div className={classes.root}>
      <StudioCombobox
        label={t('left_menu.layout_dropdown_menu_label')}
        hideLabel
        value={[selectedFormLayoutSetName]}
        onValueChange={([value]) => handleLayoutSetChange(value)}
      >
        {layoutSets.map((layoutSet) => (
          <StudioCombobox.Option
            value={layoutSet.id}
            key={layoutSet.id}
            description={layoutSet.type === 'subform' && t('ux_editor.sub_form')}
          >
            {layoutSet.id}
          </StudioCombobox.Option>
        ))}
      </StudioCombobox>
      {shouldDisplayFeature('exportForm') && <ExportForm />}
      {shouldDisplayFeature('subForm') && (
        <SubFormWrapper
          layoutSets={layoutSetsResponse}
          onSubFormCreated={handleLayoutSetChange}
          selectedLayoutSet={selectedFormLayoutSetName}
        />
      )}
    </div>
  );
}

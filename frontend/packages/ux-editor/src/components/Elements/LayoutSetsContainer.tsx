import React, { useEffect } from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../hooks';
import classes from './LayoutSetsContainer.module.css';
import { ExportForm } from './ExportForm';
import { shouldDisplayFeature, FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import { StudioCombobox, StudioPageSpinner } from '@studio/components';
import { DeleteSubformWrapper } from './Subform/DeleteSubformWrapper';
import { useLayoutSetsExtendedQuery } from 'app-shared/hooks/queries/useLayoutSetsExtendedQuery';
import { getLayoutSetTypeTranslationKey } from 'app-shared/utils/layoutSetsUtils';
import { useTranslation } from 'react-i18next';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';

export function LayoutSetsContainer() {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSetsResponse } = useLayoutSetsQuery(org, app);
  const { data: layoutSets } = useLayoutSetsExtendedQuery(org, app);
  const { t } = useTranslation();
  const {
    selectedFormLayoutSetName,
    setSelectedFormLayoutSetName,
    setSelectedFormLayoutName,
    updateLayoutsForPreview,
    updateLayoutSettingsForPreview,
    onLayoutSetNameChange,
  } = useAppContext();

  useEffect(() => {
    onLayoutSetNameChange(selectedFormLayoutSetName);
  }, [onLayoutSetNameChange, selectedFormLayoutSetName]);

  if (!layoutSetsResponse || !layoutSets) return null;

  const handleLayoutSetChange = async (layoutSetName: string) => {
    if (selectedFormLayoutSetName !== layoutSetName && layoutSetName) {
      await updateLayoutsForPreview(layoutSetName);
      await updateLayoutSettingsForPreview(layoutSetName);

      setSelectedFormLayoutSetName(layoutSetName);
      setSelectedFormLayoutName(undefined);
      onLayoutSetNameChange(layoutSetName);
    }
  };

  if (
    layoutSets.sets.find((layoutSet) => layoutSet.id === selectedFormLayoutSetName) === undefined
  ) {
    handleLayoutSetChange(layoutSets.sets[0].id);
    return <StudioPageSpinner spinnerTitle={t('ux_editor.loading_form_layout')} />;
  }

  return (
    <div className={classes.root}>
      <StudioCombobox
        label={t('left_menu.layout_dropdown_menu_label')}
        hideLabel
        value={[selectedFormLayoutSetName]}
        onValueChange={([value]) => handleLayoutSetChange(value)}
      >
        {layoutSets.sets.map((layoutSet) => (
          <StudioCombobox.Option
            value={layoutSet.id}
            key={layoutSet.id}
            description={t(getLayoutSetTypeTranslationKey(layoutSet))}
          >
            {layoutSet.id}
          </StudioCombobox.Option>
        ))}
      </StudioCombobox>
      {shouldDisplayFeature(FeatureFlag.ExportForm) && <ExportForm />}
      {shouldDisplayFeature(FeatureFlag.Subform) && (
        <DeleteSubformWrapper
          layoutSets={layoutSetsResponse}
          selectedLayoutSet={selectedFormLayoutSetName}
        />
      )}
    </div>
  );
}

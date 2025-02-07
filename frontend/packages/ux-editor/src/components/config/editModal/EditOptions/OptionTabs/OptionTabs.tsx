import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioTabs } from '@studio/components';
import { ReferenceTab } from './ReferenceTab/ReferenceTab';
import { shouldDisplayFeature, FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import { ManualTab } from './ManualTab';
import { EditTab } from './EditTab';
import { SelectedOptionsType } from '../EditOptions';
import type { IGenericEditComponent } from '../../../componentConfig';
import type { SelectionComponentType } from '../../../../../types/FormComponent';
import classes from './OptionTabs.module.css';
import { SelectTab } from './SelectTab';
import {
  getSelectedOptionsTypeWithManualSupport,
  getSelectedOptionsType,
} from './utils/optionsUtils';

type OptionTabsProps = {
  optionListIds: string[];
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

export function OptionTabs({ component, handleComponentChange, optionListIds }: OptionTabsProps) {
  return (
    <>
      {shouldDisplayFeature(FeatureFlag.OptionListEditor) ? (
        <OptionTabsMergedTabs
          component={component}
          handleComponentChange={handleComponentChange}
          optionListIds={optionListIds}
        />
      ) : (
        <OptionTabsSplitTabs
          component={component}
          handleComponentChange={handleComponentChange}
          optionListIds={optionListIds}
        />
      )}
    </>
  );
}

function OptionTabsMergedTabs({
  component,
  handleComponentChange,
  optionListIds,
}: OptionTabsProps) {
  const initialSelectedOptionsType = getSelectedOptionsType(
    component.optionsId,
    component.options,
    optionListIds || [],
  );
  const [selectedOptionsType, setSelectedOptionsType] = useState(initialSelectedOptionsType);
  const { t } = useTranslation();

  return (
    <StudioTabs
      value={selectedOptionsType}
      size='small'
      onChange={(value) => {
        setSelectedOptionsType(value as SelectedOptionsType);
      }}
    >
      <StudioTabs.List>
        <StudioTabs.Tab value={SelectedOptionsType.CodeList}>
          {t('ux_editor.options.tab_code_list')}
        </StudioTabs.Tab>
        <StudioTabs.Tab value={SelectedOptionsType.ReferenceId}>
          {t('ux_editor.options.tab_reference_id')}
        </StudioTabs.Tab>
      </StudioTabs.List>
      <StudioTabs.Content className={classes.tabContent} value={SelectedOptionsType.CodeList}>
        <EditTab component={component} handleComponentChange={handleComponentChange} />
      </StudioTabs.Content>
      <StudioTabs.Content value={SelectedOptionsType.ReferenceId} className={classes.tabContent}>
        <ReferenceTab component={component} handleComponentChange={handleComponentChange} />
      </StudioTabs.Content>
    </StudioTabs>
  );
}

// Todo: Remove once featureFlag "optionListEditor" is removed.
function OptionTabsSplitTabs({ component, handleComponentChange, optionListIds }: OptionTabsProps) {
  const initialSelectedOptionsType = getSelectedOptionsTypeWithManualSupport(
    component.optionsId,
    component.options,
    optionListIds || [],
  );
  const [selectedOptionsType, setSelectedOptionsType] = useState(initialSelectedOptionsType);
  const { t } = useTranslation();

  return (
    <StudioTabs
      value={selectedOptionsType}
      size='small'
      onChange={(value) => {
        setSelectedOptionsType(value as SelectedOptionsType);
      }}
    >
      <StudioTabs.List>
        <StudioTabs.Tab value={SelectedOptionsType.CodeList}>
          {t('ux_editor.options.tab_code_list')}
        </StudioTabs.Tab>
        <StudioTabs.Tab value={SelectedOptionsType.Manual}>
          {t('ux_editor.options.tab_manual')}
        </StudioTabs.Tab>
        <StudioTabs.Tab value={SelectedOptionsType.ReferenceId}>
          {t('ux_editor.options.tab_reference_id')}
        </StudioTabs.Tab>
      </StudioTabs.List>
      <StudioTabs.Content className={classes.tabContent} value={SelectedOptionsType.CodeList}>
        <SelectTab component={component} handleComponentChange={handleComponentChange} />
      </StudioTabs.Content>
      <StudioTabs.Content value={SelectedOptionsType.Manual} className={classes.tabContent}>
        <ManualTab component={component} handleComponentChange={handleComponentChange} />
      </StudioTabs.Content>
      <StudioTabs.Content value={SelectedOptionsType.ReferenceId} className={classes.tabContent}>
        <ReferenceTab component={component} handleComponentChange={handleComponentChange} />
      </StudioTabs.Content>
    </StudioTabs>
  );
}

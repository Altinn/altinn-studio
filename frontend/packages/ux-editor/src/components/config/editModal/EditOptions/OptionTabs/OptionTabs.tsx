import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioTabs, StudioAlert, StudioErrorMessage } from '@studio/components';
import { ReferenceTab } from './ReferenceTab/ReferenceTab';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { ManualTab } from './ManualTab';
import { EditTab } from './EditTab';
import { useComponentErrorMessage } from '../../../../../hooks';
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
  renderOptions?: {
    isOnlyOptionsIdSupported?: boolean;
  };
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

export function OptionTabs({
  component,
  handleComponentChange,
  optionListIds,
  renderOptions,
}: OptionTabsProps) {
  return (
    <>
      {shouldDisplayFeature('optionListEditor') ? (
        <OptionTabsMergedTabs
          component={component}
          handleComponentChange={handleComponentChange}
          optionListIds={optionListIds}
          renderOptions={renderOptions}
        />
      ) : (
        <OptionTabsSplitTabs
          component={component}
          handleComponentChange={handleComponentChange}
          optionListIds={optionListIds}
          renderOptions={renderOptions}
        />
      )}
    </>
  );
}

function OptionTabsMergedTabs({
  component,
  handleComponentChange,
  optionListIds,
  renderOptions,
}: OptionTabsProps) {
  const initialSelectedOptionsType = getSelectedOptionsTypeWithManualSupport(
    component.optionsId,
    component.options,
    optionListIds || [],
  );
  const [selectedOptionsType, setSelectedOptionsType] = useState(initialSelectedOptionsType);
  const { t } = useTranslation();

  useEffect(() => {
    const updatedSelectedOptionsType = getSelectedOptionsType(
      component.optionsId,
      component.options,
      optionListIds,
    );
    setSelectedOptionsType(updatedSelectedOptionsType);
  }, [optionListIds, component.optionsId, component.options, setSelectedOptionsType]);

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
          {t('ux_editor.options.tab_referenceId')}
        </StudioTabs.Tab>
      </StudioTabs.List>
      <StudioTabs.Content className={classes.tabContent} value={SelectedOptionsType.CodeList}>
        <TabWithErrorHandling
          component={component}
          handleComponentChange={handleComponentChange}
          isOnlyOptionsIdSupported={renderOptions.isOnlyOptionsIdSupported}
        />
      </StudioTabs.Content>
      <StudioTabs.Content value={SelectedOptionsType.ReferenceId} className={classes.tabContent}>
        <ReferenceTab component={component} handleComponentChange={handleComponentChange} />
      </StudioTabs.Content>
    </StudioTabs>
  );
}

// Todo: Remove once featureFlag "optionListEditor" is removed.
function OptionTabsSplitTabs({
  component,
  handleComponentChange,
  optionListIds,
  renderOptions,
}: OptionTabsProps) {
  const initialSelectedOptionsType = getSelectedOptionsTypeWithManualSupport(
    component.optionsId,
    component.options,
    optionListIds || [],
  );
  const [selectedOptionsType, setSelectedOptionsType] = useState(initialSelectedOptionsType);
  const { t } = useTranslation();

  useEffect(() => {
    const updatedSelectedOptionsType = getSelectedOptionsTypeWithManualSupport(
      component.optionsId,
      component.options,
      optionListIds,
    );
    setSelectedOptionsType(updatedSelectedOptionsType);
  }, [optionListIds, component.optionsId, component.options, setSelectedOptionsType]);

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
          {t('ux_editor.options.tab_referenceId')}
        </StudioTabs.Tab>
      </StudioTabs.List>
      <StudioTabs.Content className={classes.tabContent} value={SelectedOptionsType.CodeList}>
        <SelectTab component={component} handleComponentChange={handleComponentChange} />
      </StudioTabs.Content>
      <StudioTabs.Content value={SelectedOptionsType.Manual} className={classes.tabContent}>
        <TabWithErrorHandling
          component={component}
          handleComponentChange={handleComponentChange}
          isOnlyOptionsIdSupported={renderOptions.isOnlyOptionsIdSupported}
        />
      </StudioTabs.Content>
      <StudioTabs.Content value={SelectedOptionsType.ReferenceId} className={classes.tabContent}>
        <ReferenceTab component={component} handleComponentChange={handleComponentChange} />
      </StudioTabs.Content>
    </StudioTabs>
  );
}

type TabWithErrorHandlingProps = {
  isOnlyOptionsIdSupported: boolean;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

function TabWithErrorHandling({
  component,
  handleComponentChange,
  isOnlyOptionsIdSupported,
}: TabWithErrorHandlingProps) {
  const { t } = useTranslation();
  const errorMessage = useComponentErrorMessage(component);

  if (!isOnlyOptionsIdSupported) {
    return (
      <StudioAlert className={classes.tabAlert} severity='info'>
        {t('ux_editor.options.code_list_only')}
      </StudioAlert>
    );
  }

  return (
    <>
      {shouldDisplayFeature('optionListEditor') ? (
        <EditTab component={component} handleComponentChange={handleComponentChange} />
      ) : (
        <ManualTab component={component} handleComponentChange={handleComponentChange} />
      )}
      {errorMessage && (
        <StudioErrorMessage className={classes.errorMessage} size='small'>
          {errorMessage}
        </StudioErrorMessage>
      )}
    </>
  );
}

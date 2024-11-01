import { getSelectedOptionsType } from '@altinn/ux-editor/utils/optionsUtils';
import React, { ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import classes from '@altinn/ux-editor/components/config/editModal/EditOptions/EditOptions.module.css';
import { EditCodeList, EditCodeListReference } from './EditCodeList';
import { SelectedOptionsType } from '@altinn/ux-editor/components/config/editModal/EditOptions/EditOptions';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { EditManualOptionsWithEditor } from './EditManualOptionsWithEditor';
import { EditManualOptions } from './EditManualOptions';
import { StudioTabs, StudioAlert, StudioErrorMessage } from '@studio/components';
import { useComponentErrorMessage } from '@altinn/ux-editor/hooks';

export const OptionTabs = ({
  optionListIds,
  component,
  handleComponentChange,
  renderOptions,
}): ReactElement => {
  const initialSelectedOptionsType = getSelectedOptionsType(
    component.optionsId,
    component.options,
    optionListIds || [],
  );
  const [selectedOptionsType, setSelectedOptionsType] = useState(initialSelectedOptionsType);
  const { t } = useTranslation();

  useEffect(() => {
    if (!optionListIds) return;
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
          {t('ux_editor.options.tab_codelist')}
        </StudioTabs.Tab>
        <StudioTabs.Tab value={SelectedOptionsType.Manual}>
          {t('ux_editor.options.tab_manual')}
        </StudioTabs.Tab>
        <StudioTabs.Tab value={SelectedOptionsType.ReferenceId}>
          {t('ux_editor.options.tab_referenceId')}
        </StudioTabs.Tab>
      </StudioTabs.List>
      <StudioTabs.Content
        className={classes.codelistTabContent}
        value={SelectedOptionsType.CodeList}
      >
        <EditCodeList component={component} handleComponentChange={handleComponentChange} />
      </StudioTabs.Content>
      <StudioTabs.Content value={SelectedOptionsType.Manual} className={classes.manualTabContent}>
        <RenderManualOptions
          component={component}
          handleComponentChange={handleComponentChange}
          isLayoutOptionsUnsupported={renderOptions.isLayoutOptionsUnsupported}
        />
      </StudioTabs.Content>
      <StudioTabs.Content
        value={SelectedOptionsType.ReferenceId}
        className={classes.codelistTabContent}
      >
        <EditCodeListReference
          component={component}
          handleComponentChange={handleComponentChange}
        />
      </StudioTabs.Content>
    </StudioTabs>
  );
};

const RenderManualOptions = ({
  component,
  handleComponentChange,
  isLayoutOptionsUnsupported,
}): ReactElement => {
  const errorMessage = useComponentErrorMessage(component);
  const { t } = useTranslation();

  if (isLayoutOptionsUnsupported) {
    return <StudioAlert severity='info'>{t('ux_editor.options.codelist_only')}</StudioAlert>;
  }

  return (
    <>
      {shouldDisplayFeature('codeListEditor') ? (
        <EditManualOptionsWithEditor
          component={component}
          handleComponentChange={handleComponentChange}
        />
      ) : (
        <EditManualOptions component={component} handleComponentChange={handleComponentChange} />
      )}
      {errorMessage && (
        <StudioErrorMessage className={classes.errorMessage} size='small'>
          {errorMessage}
        </StudioErrorMessage>
      )}
    </>
  );
};

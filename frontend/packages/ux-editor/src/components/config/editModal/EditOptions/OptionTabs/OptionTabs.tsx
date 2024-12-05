import { getSelectedOptionsType } from '@altinn/ux-editor/utils/optionsUtils';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './OptionTabs.module.css';
import { EditOptionList, EditOptionListReference } from './EditOptionList';
import { SelectedOptionsType } from '@altinn/ux-editor/components/config/editModal/EditOptions/EditOptions';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { EditManualOptionsWithEditor } from './EditManualOptionsWithEditor';
import { EditManualOptions } from './EditManualOptions';
import { StudioTabs, StudioAlert, StudioErrorMessage } from '@studio/components';
import { useComponentErrorMessage } from '@altinn/ux-editor/hooks';
import type { IGenericEditComponent } from '@altinn/ux-editor/components/config/componentConfig';
import type { SelectionComponentType } from '@altinn/ux-editor/types/FormComponent';

type OptionTabsProps = {
  optionListIds: string[];
  renderOptions?: {
    areLayoutOptionsSupported?: boolean;
  };
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

export const OptionTabs = ({
  component,
  handleComponentChange,
  optionListIds,
  renderOptions,
}: OptionTabsProps) => {
  const initialSelectedOptionsType = getSelectedOptionsType(
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
        <EditOptionList component={component} handleComponentChange={handleComponentChange} />
      </StudioTabs.Content>
      <StudioTabs.Content value={SelectedOptionsType.Manual} className={classes.manualTabContent}>
        <RenderManualOptions
          component={component}
          handleComponentChange={handleComponentChange}
          areLayoutOptionsSupported={renderOptions.areLayoutOptionsSupported}
        />
      </StudioTabs.Content>
      <StudioTabs.Content
        value={SelectedOptionsType.ReferenceId}
        className={classes.codelistTabContent}
      >
        <EditOptionListReference
          component={component}
          handleComponentChange={handleComponentChange}
        />
      </StudioTabs.Content>
    </StudioTabs>
  );
};

type RenderManualOptionsProps = {
  areLayoutOptionsSupported: boolean;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

const RenderManualOptions = ({
  component,
  handleComponentChange,
  areLayoutOptionsSupported,
}: RenderManualOptionsProps) => {
  const errorMessage = useComponentErrorMessage(component);
  const { t } = useTranslation();

  if (areLayoutOptionsSupported === false) {
    return (
      <StudioAlert className={classes.manualTabAlert} severity='info'>
        {t('ux_editor.options.code_list_only')}
      </StudioAlert>
    );
  }

  return (
    <>
      {shouldDisplayFeature('optionListEditor') ? (
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

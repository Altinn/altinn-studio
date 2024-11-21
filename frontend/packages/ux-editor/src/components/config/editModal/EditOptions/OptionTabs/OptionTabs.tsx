import { getSelectedOptionsType } from '@altinn/ux-editor/utils/optionsUtils';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioTabs, StudioAlert, StudioErrorMessage } from '@studio/components';
import { EditOptionListReference } from './EditOptionChoice/EditOptionList';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { EditManualOptions } from './EditManualOptions';
import { EditOptionChoice } from './EditOptionChoice';
import { useComponentErrorMessage } from '@altinn/ux-editor/hooks';
import { SelectedOptionsType } from '@altinn/ux-editor/components/config/editModal/EditOptions/EditOptions';
import type { IGenericEditComponent } from '@altinn/ux-editor/components/config/componentConfig';
import type { SelectionComponentType } from '@altinn/ux-editor/types/FormComponent';
import classes from './OptionTabs.module.css';
import { EditOptionList } from './EditOptionList-v1';

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
      {shouldDisplayFeature('optionListEditor') ? (
        <>
          <StudioTabs.List>
            <StudioTabs.Tab value={SelectedOptionsType.CodeList}>
              {t('ux_editor.options.tab_code_list')}
            </StudioTabs.Tab>
            <StudioTabs.Tab value={SelectedOptionsType.ReferenceId}>
              {t('ux_editor.options.tab_referenceId')}
            </StudioTabs.Tab>
          </StudioTabs.List>
          <StudioTabs.Content className={classes.tabContent} value={SelectedOptionsType.CodeList}>
            <RenderOptions
              component={component}
              handleComponentChange={handleComponentChange}
              areLayoutOptionsSupported={renderOptions.areLayoutOptionsSupported}
            />
          </StudioTabs.Content>
          <StudioTabs.Content
            value={SelectedOptionsType.ReferenceId}
            className={classes.tabContent}
          >
            <EditOptionListReference
              component={component}
              handleComponentChange={handleComponentChange}
            />
          </StudioTabs.Content>
        </>
      ) : (
        <>
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
            <EditOptionList component={component} handleComponentChange={handleComponentChange} />
          </StudioTabs.Content>
          <StudioTabs.Content value={SelectedOptionsType.Manual} className={classes.tabContent}>
            <RenderManualOptions
              component={component}
              handleComponentChange={handleComponentChange}
              areLayoutOptionsSupported={renderOptions.areLayoutOptionsSupported}
            />
          </StudioTabs.Content>
          <StudioTabs.Content
            value={SelectedOptionsType.ReferenceId}
            className={classes.tabContent}
          >
            <EditOptionListReference
              component={component}
              handleComponentChange={handleComponentChange}
            />
          </StudioTabs.Content>
        </>
      )}
    </StudioTabs>
  );
};

type RenderOptionsProps = {
  areLayoutOptionsSupported: boolean;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

const RenderOptions = ({
  component,
  handleComponentChange,
  areLayoutOptionsSupported,
}: RenderOptionsProps) => {
  const errorMessage = useComponentErrorMessage(component);
  const { t } = useTranslation();

  if (areLayoutOptionsSupported === false) {
    return (
      <StudioAlert className={classes.tabAlert} severity='info'>
        {t('ux_editor.options.code_list_only')}
      </StudioAlert>
    );
  }

  return (
    <>
      <EditOptionChoice component={component} handleComponentChange={handleComponentChange} />
      {errorMessage && component.options !== undefined && (
        <StudioErrorMessage className={classes.errorMessage} size='small'>
          {errorMessage}
        </StudioErrorMessage>
      )}
    </>
  );
};

type RenderManualOptionsV1Props = {
  areLayoutOptionsSupported: boolean;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

const RenderManualOptions = ({
  component,
  handleComponentChange,
  areLayoutOptionsSupported,
}: RenderManualOptionsV1Props) => {
  const errorMessage = useComponentErrorMessage(component);
  const { t } = useTranslation();

  if (areLayoutOptionsSupported === false) {
    return (
      <StudioAlert className={classes.tabAlert} severity='info'>
        {t('ux_editor.options.code_list_only')}
      </StudioAlert>
    );
  }

  return (
    <>
      <EditManualOptions component={component} handleComponentChange={handleComponentChange} />
      {errorMessage && (
        <StudioErrorMessage className={classes.errorMessage} size='small'>
          {errorMessage}
        </StudioErrorMessage>
      )}
    </>
  );
};

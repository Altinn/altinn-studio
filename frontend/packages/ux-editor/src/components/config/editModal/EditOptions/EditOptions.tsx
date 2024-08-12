import React, { useEffect, useRef } from 'react';
import { ErrorMessage, Tabs, Heading } from '@digdir/designsystemet-react';
import classes from './EditOptions.module.css';
import type { IGenericEditComponent } from '../../componentConfig';
import { EditCodeList, EditCodeListReference } from './EditCodeList';
import { getSelectedOptionsType } from '../../../../utils/optionsUtils';
import { useOptionListIdsQuery } from '../../../../hooks/queries/useOptionListIdsQuery';

import { StudioSpinner } from '@studio/components';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { EditManualOptions } from './EditManualOptions/EditManualOptions';

type SelectionComponentType = ComponentType.Checkboxes | ComponentType.RadioButtons;

export interface ISelectionEditComponentProvidedProps<T extends SelectionComponentType>
  extends IGenericEditComponent<T> {
  renderOptions?: {
    onlyCodeListOptions?: boolean;
  };
}

export enum SelectedOptionsType {
  CodeList = 'codelist',
  Manual = 'manual',
  ReferenceId = 'referenceId',
  Unknown = '',
}

export function EditOptions<T extends SelectionComponentType>({
  editFormId,
  component,
  handleComponentChange,
  renderOptions,
}: ISelectionEditComponentProvidedProps<T>) {
  const previousEditFormId = useRef(editFormId);
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIds, isPending, isError, error } = useOptionListIdsQuery(org, app);
  const [initialSelectedOptionType, setInitialSelectedOptionType] =
    React.useState<SelectedOptionsType>(
      getSelectedOptionsType(component.optionsId, component.options, optionListIds || []),
    );
  const { t } = useTranslation();

  useEffect(() => {
    if (editFormId !== previousEditFormId.current) {
      previousEditFormId.current = editFormId;
    }
  }, [editFormId]);

  useEffect(() => {
    if (!optionListIds) return;
    setInitialSelectedOptionType(
      getSelectedOptionsType(component.optionsId, component.options, optionListIds),
    );
    console.log('optionListIds: ', optionListIds);
  }, [optionListIds, component.optionsId, component.options, setInitialSelectedOptionType]);

  if (renderOptions?.onlyCodeListOptions) {
    return <EditCodeList component={component} handleComponentChange={handleComponentChange} />;
  }

  return (
    <div className={classes.root}>
      <Heading level={3} size='xxsmall' spacing={true}>
        {t('ux_editor.options.section_heading')}
      </Heading>
      {isPending ? (
        <StudioSpinner
          showSpinnerTitle={false}
          spinnerTitle={t('ux_editor.modal_properties_loading')}
        />
      ) : isError ? (
        <ErrorMessage>
          {error instanceof Error ? error.message : t('ux_editor.modal_properties_error_message')}
        </ErrorMessage>
      ) : (
        <Tabs
          value={initialSelectedOptionType}
          onChange={(value) => {
            setInitialSelectedOptionType(value as SelectedOptionsType);
          }}
        >
          <Tabs.List>
            <Tabs.Tab value={SelectedOptionsType.CodeList}>
              {t('ux_editor.options.tab_codelist')}
            </Tabs.Tab>
            <Tabs.Tab value={SelectedOptionsType.Manual}>
              {t('ux_editor.options.tab_manual')}
            </Tabs.Tab>
            <Tabs.Tab value={SelectedOptionsType.ReferenceId}>
              {t('ux_editor.options.tab_referenceId')}
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Content value={SelectedOptionsType.CodeList}>
            <EditCodeList component={component} handleComponentChange={handleComponentChange} />
          </Tabs.Content>
          <Tabs.Content value={SelectedOptionsType.Manual}>
            <EditManualOptions
              component={component}
              handleComponentChange={handleComponentChange}
            />
          </Tabs.Content>
          <Tabs.Content value={SelectedOptionsType.ReferenceId}>
            <EditCodeListReference
              component={component}
              handleComponentChange={handleComponentChange}
            />
          </Tabs.Content>
        </Tabs>
      )}
    </div>
  );
}

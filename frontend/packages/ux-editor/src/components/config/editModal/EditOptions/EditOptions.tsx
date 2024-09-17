import React, { useEffect, useRef } from 'react';
import { ErrorMessage, Heading, Alert } from '@digdir/designsystemet-react';
import classes from './EditOptions.module.css';
import type { IGenericEditComponent } from '../../componentConfig';
import { EditCodeList, EditCodeListReference } from './EditCodeList';
import { getSelectedOptionsType } from '../../../../utils/optionsUtils';
import { useOptionListIdsQuery } from '../../../../hooks/queries/useOptionListIdsQuery';

import { StudioSpinner, StudioTabs } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { EditManualOptions } from './EditManualOptions/EditManualOptions';
import type { SelectionComponentType } from '../../../../types/FormComponent';

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
  }, [optionListIds, component.optionsId, component.options, setInitialSelectedOptionType]);

  return (
    <div className={classes.root}>
      <Heading level={3} size='xxsmall' spacing={true} className={classes.optionsHeading}>
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
        <StudioTabs
          value={initialSelectedOptionType}
          size='small'
          onChange={(value) => {
            setInitialSelectedOptionType(value as SelectedOptionsType);
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
          <StudioTabs.Content value={SelectedOptionsType.CodeList}>
            <EditCodeList component={component} handleComponentChange={handleComponentChange} />
          </StudioTabs.Content>
          <StudioTabs.Content
            className={classes.manualTabContent}
            value={SelectedOptionsType.Manual}
          >
            {renderOptions.onlyCodeListOptions ? (
              <Alert severity='info'>{t('ux_editor.options.codelist_only')}</Alert>
            ) : (
              <EditManualOptions
                component={component}
                handleComponentChange={handleComponentChange}
              />
            )}
          </StudioTabs.Content>
          <StudioTabs.Content value={SelectedOptionsType.ReferenceId}>
            <EditCodeListReference
              component={component}
              handleComponentChange={handleComponentChange}
            />
          </StudioTabs.Content>
        </StudioTabs>
      )}
    </div>
  );
}

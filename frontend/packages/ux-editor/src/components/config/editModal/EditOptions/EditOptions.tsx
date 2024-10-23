import React, { useEffect, useRef } from 'react';
import { ErrorMessage, Heading } from '@digdir/designsystemet-react';
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
  const { data: staticOptionListIds, isPending, isError, error } = useOptionListIdsQuery(org, app);
  const { t } = useTranslation();
  const initialSelectedOptionsType = getSelectedOptionsType(
    component.optionsId,
    component.options,
    staticOptionListIds || [],
  );
  const [selectedOptionsType, setSelectedOptionsType] = React.useState(initialSelectedOptionsType);

  useEffect(() => {
    if (editFormId !== previousEditFormId.current) {
      previousEditFormId.current = editFormId;
    }
  }, [editFormId]);

  useEffect(() => {
    if (!staticOptionListIds) return;
    const updatedSelectedOptionsType = getSelectedOptionsType(
      component.optionsId,
      component.options,
      staticOptionListIds,
    );
    setSelectedOptionsType(updatedSelectedOptionsType);
  }, [staticOptionListIds, component.optionsId, component.options, setSelectedOptionsType]);

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
        <ErrorMessage className={classes.errorMessage}>
          {error instanceof Error ? error.message : t('ux_editor.modal_properties_error_message')}
        </ErrorMessage>
      ) : (
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
          <StudioTabs.Content
            value={SelectedOptionsType.Manual}
            className={classes.manualTabContent}
          >
            <EditManualOptions
              component={component}
              handleComponentChange={handleComponentChange}
              onlyCodeListOptions={renderOptions.onlyCodeListOptions}
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
      )}
    </div>
  );
}

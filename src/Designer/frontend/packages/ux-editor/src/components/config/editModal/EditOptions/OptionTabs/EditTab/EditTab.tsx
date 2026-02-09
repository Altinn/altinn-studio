import React, { useRef } from 'react';
import {
  StudioAlert,
  StudioButton,
  StudioSpinner,
  StudioValidationMessage,
} from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import {
  handleOptionsChange,
  hasEditableOptionList,
  updateComponentOptions,
} from '../utils/optionsUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useOptionListIdsQuery } from '../../../../../../hooks/queries/useOptionListIdsQuery';
import type { SelectionComponentType } from '../../../../../../types/FormComponent';
import type { IGenericEditComponent } from '../../../../componentConfig';
import type { QueryStatus } from '@tanstack/react-query';
import { OptionListFromAppLibrarySelector } from './OptionListFromAppLibrarySelector';
import { OptionListUploader } from './OptionListUploader';
import { OptionListEditor } from './OptionListEditor';
import classes from './EditTab.module.css';
import type { ITextResources } from 'app-shared/types/global';
import { ManualOptionsDialog } from './ManualOptionsDialog';
import { retrieveOptionsType } from '../utils/retrieveOptionsType';
import { OptionsType } from '../enums/OptionsType';
import type { CodeListIdContextData } from '../types/CodeListIdContextData';
import { PublishedOptionListSelector } from './PublishedOptionListSelector';

export type EditTabProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export function EditTab(props: EditTabProps): React.ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: idsFromAppLibrary, status: optionListIdsStatus } = useOptionListIdsQuery(org, app);
  const { data: textResources, status: textResourcesStatus } = useTextResourcesQuery(org, app);

  const mergedQueryStatues: QueryStatus = mergeQueryStatuses(
    optionListIdsStatus,
    textResourcesStatus,
  );

  switch (mergedQueryStatues) {
    case 'pending':
      return <StudioSpinner aria-hidden spinnerTitle={t('general.loading')} />;
    case 'error':
      return (
        <StudioValidationMessage>
          {t('ux_editor.modal_properties_fetch_option_list_ids_error_message')}
        </StudioValidationMessage>
      );
    case 'success':
      return (
        <EditTabWithData
          {...props}
          codeListIdContextData={{ idsFromAppLibrary, orgName: org }}
          textResources={textResources}
        />
      );
  }
}

type EditTabWithDataProps = EditTabProps & {
  codeListIdContextData: CodeListIdContextData;
  textResources: ITextResources;
};

function EditTabWithData({
  codeListIdContextData,
  component,
  handleComponentChange,
  textResources,
}: EditTabWithDataProps): React.ReactElement {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <div className={classes.container}>
      <ManualOptionsDialog
        component={component}
        handleComponentChange={handleComponentChange}
        ref={dialogRef}
        textResources={textResources}
      />
      <OptionListTools
        codeListIdContextData={codeListIdContextData}
        component={component}
        handleComponentChange={handleComponentChange}
        openDialog={() => dialogRef.current.showModal()}
        textResources={textResources}
      />
      {retrieveOptionsType(component, codeListIdContextData) === OptionsType.CustomId && (
        <StudioAlert className={classes.alert}>
          {t('ux_editor.options.tab_option_list_alert_title')}
        </StudioAlert>
      )}
    </div>
  );
}

type OptionListToolsProps = EditTabWithDataProps & { openDialog: () => void };

function OptionListTools({
  codeListIdContextData,
  component,
  handleComponentChange,
  openDialog,
  textResources,
}: OptionListToolsProps): React.ReactElement {
  if (hasEditableOptionList(component, codeListIdContextData)) {
    return (
      <OptionListEditor
        codeListIdContextData={codeListIdContextData}
        component={component}
        handleComponentChange={handleComponentChange}
        onEditButtonClick={openDialog}
        textResources={textResources}
      />
    );
  } else {
    return (
      <AddOptionList
        component={component}
        handleComponentChange={handleComponentChange}
        onCreateButtonClick={openDialog}
        orgName={codeListIdContextData.orgName}
      />
    );
  }
}

OptionListTools.displayName = 'OptionListTools';

type AddOptionListProps = EditTabProps & {
  onCreateButtonClick: () => void;
  orgName: string;
};

function AddOptionList({
  component,
  handleComponentChange,
  onCreateButtonClick,
  orgName,
}: AddOptionListProps) {
  const { t } = useTranslation();

  const handleCreateButtonClick = () => {
    const updatedComponent = updateComponentOptions(component, []);
    handleOptionsChange(updatedComponent, handleComponentChange);
    onCreateButtonClick();
  };

  return (
    <div className={classes.addOptionListContainer}>
      <StudioButton variant='secondary' onClick={handleCreateButtonClick}>
        {t('general.create_new')}
      </StudioButton>
      <OptionListFromAppLibrarySelector
        component={component}
        handleComponentChange={handleComponentChange}
      />
      <OptionListUploader component={component} handleComponentChange={handleComponentChange} />
      <PublishedOptionListSelector
        component={component}
        handleComponentChange={handleComponentChange}
        orgName={orgName}
      />
    </div>
  );
}

import React, { useRef } from 'react';
import {
  StudioAlert,
  StudioButton,
  StudioErrorMessage,
  StudioSpinner,
} from 'libs/studio-components-legacy/src';
import { useTranslation } from 'react-i18next';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import {
  handleOptionsChange,
  updateComponentOptions,
  hasStaticOptionList,
  isOptionsIdReferenceId,
} from '../utils/optionsUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useOptionListIdsQuery } from '../../../../../../hooks/queries/useOptionListIdsQuery';
import type { SelectionComponentType } from '../../../../../../types/FormComponent';
import type { IGenericEditComponent } from '../../../../componentConfig';
import type { QueryStatus } from '@tanstack/react-query';
import { OptionListSelector } from './OptionListSelector';
import { OptionListUploader } from './OptionListUploader';
import { OptionListEditor } from './OptionListEditor';
import classes from './EditTab.module.css';
import type { ITextResources } from 'app-shared/types/global';
import { ManualOptionsDialog } from './ManualOptionsDialog';

export type EditTabProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export function EditTab(props: EditTabProps): React.ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIds, status: optionListIdsStatus } = useOptionListIdsQuery(org, app);
  const { data: textResources, status: textResourcesStatus } = useTextResourcesQuery(org, app);

  const mergedQueryStatues: QueryStatus = mergeQueryStatuses(
    optionListIdsStatus,
    textResourcesStatus,
  );

  switch (mergedQueryStatues) {
    case 'pending':
      return <StudioSpinner spinnerTitle={t('general.loading')} />;
    case 'error':
      return (
        <StudioErrorMessage>
          {t('ux_editor.modal_properties_fetch_option_list_ids_error_message')}
        </StudioErrorMessage>
      );
    case 'success':
      return (
        <EditTabWithData {...props} optionListIds={optionListIds} textResources={textResources} />
      );
  }
}

type EditTabWithDataProps = EditTabProps & {
  optionListIds: string[];
  textResources: ITextResources;
};

function EditTabWithData({
  component,
  handleComponentChange,
  optionListIds,
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
        component={component}
        handleComponentChange={handleComponentChange}
        openDialog={() => dialogRef.current.showModal()}
        optionListIds={optionListIds}
        textResources={textResources}
      />
      {isOptionsIdReferenceId(optionListIds, component.optionsId) && (
        <StudioAlert className={classes.alert} severity={'info'} size='sm'>
          {t('ux_editor.options.tab_option_list_alert_title')}
        </StudioAlert>
      )}
    </div>
  );
}

type OptionListToolsProps = EditTabWithDataProps & { openDialog: () => void };

function OptionListTools({
  component,
  handleComponentChange,
  openDialog,
  optionListIds,
  textResources,
}: OptionListToolsProps): React.ReactElement {
  if (hasStaticOptionList(optionListIds, component)) {
    return (
      <OptionListEditor
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
      />
    );
  }
}

OptionListTools.displayName = 'OptionListTools';

type AddOptionListProps = EditTabProps & { onCreateButtonClick: () => void };

function AddOptionList({
  component,
  handleComponentChange,
  onCreateButtonClick,
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
      <OptionListSelector component={component} handleComponentChange={handleComponentChange} />
      <OptionListUploader component={component} handleComponentChange={handleComponentChange} />
    </div>
  );
}

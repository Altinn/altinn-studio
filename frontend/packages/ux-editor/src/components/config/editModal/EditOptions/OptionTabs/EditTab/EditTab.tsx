import React, { createRef } from 'react';
import {
  StudioAlert,
  StudioButton,
  StudioErrorMessage,
  StudioSpinner,
  usePrevious,
} from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { useUpdate } from 'app-shared/hooks/useUpdate';
import { useComponentErrorMessage } from '../../../../../../hooks';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import {
  handleOptionsChange,
  updateComponentOptions,
  hasStaticOptionList,
  isOptionsIdReferenceId,
  isInitialOptionsSet,
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

type EditTabProps = Pick<
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
  const previousComponent = usePrevious(component);
  const dialogRef = createRef<HTMLDialogElement>();
  const errorMessage = useComponentErrorMessage(component);

  useUpdate(() => {
    if (isInitialOptionsSet(previousComponent.options, component.options)) {
      dialogRef.current.showModal();
    }
  }, [component, previousComponent]);

  return (
    <div className={classes.container}>
      {hasStaticOptionList(optionListIds, component.optionsId, component.options) ? (
        <OptionListEditor
          ref={dialogRef}
          component={component}
          handleComponentChange={handleComponentChange}
          textResources={textResources}
        />
      ) : (
        <AddOptionList component={component} handleComponentChange={handleComponentChange} />
      )}
      {errorMessage && (
        <StudioErrorMessage className={classes.errorMessage} size='small'>
          {errorMessage}
        </StudioErrorMessage>
      )}
      {isOptionsIdReferenceId(optionListIds, component.optionsId) && (
        <StudioAlert className={classes.alert} severity={'info'} size='sm'>
          {t('ux_editor.options.tab_option_list_alert_title')}
        </StudioAlert>
      )}
    </div>
  );
}

type AddOptionListProps = EditTabProps;

function AddOptionList({ component, handleComponentChange }: AddOptionListProps) {
  const { t } = useTranslation();

  const handleInitialManualOptionsChange = () => {
    const updatedComponent = updateComponentOptions(component, []);
    handleOptionsChange(updatedComponent, handleComponentChange);
  };

  return (
    <div className={classes.addOptionListContainer}>
      <StudioButton variant='secondary' onClick={handleInitialManualOptionsChange}>
        {t('general.create_new')}
      </StudioButton>
      <OptionListSelector component={component} handleComponentChange={handleComponentChange} />
      <OptionListUploader component={component} handleComponentChange={handleComponentChange} />
    </div>
  );
}

import React, { createRef } from 'react';
import {
  StudioAlert,
  StudioButton,
  StudioErrorMessage,
  StudioSpinner,
  usePrevious,
} from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useUpdate } from 'app-shared/hooks/useUpdate';
import { useComponentErrorMessage } from '../../../../../../hooks';
import {
  handleOptionsChange,
  updateComponentOptions,
  isOptionsModifiable,
  isOptionsIdReferenceId,
} from '../utils/optionsUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useOptionListIdsQuery } from '../../../../../../hooks/queries/useOptionListIdsQuery';
import type { SelectionComponentType } from '../../../../../../types/FormComponent';
import type { IGenericEditComponent } from '../../../../componentConfig';
import { OptionListSelector } from './OptionListSelector';
import { OptionListUploader } from './OptionListUploader';
import { OptionListEditor } from './OptionListEditor';
import classes from './EditTab.module.css';

type EditTabProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export function EditTab({ component, handleComponentChange }: EditTabProps): React.ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIds, status } = useOptionListIdsQuery(org, app);
  const previousComponent = usePrevious(component);
  const dialogRef = createRef<HTMLDialogElement>();
  const errorMessage = useComponentErrorMessage(component);

  useUpdate(() => {
    if (!previousComponent.options && !!component.options) dialogRef.current.showModal();
  }, [component, previousComponent]);

  switch (status) {
    case 'pending':
      return (
        <StudioSpinner
          showSpinnerTitle={false}
          spinnerTitle={t('ux_editor.modal_properties_code_list_spinner_title')}
        />
      );
    case 'error':
      return (
        <StudioErrorMessage>
          {t('ux_editor.modal_properties_fetch_option_list_ids_error_message')}
        </StudioErrorMessage>
      );
    case 'success':
      return (
        <div className={classes.container}>
          {isOptionsModifiable(optionListIds, component.optionsId, component.options) ? (
            <OptionListEditor
              ref={dialogRef}
              component={component}
              handleComponentChange={handleComponentChange}
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

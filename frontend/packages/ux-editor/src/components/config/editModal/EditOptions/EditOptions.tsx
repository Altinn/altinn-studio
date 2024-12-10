import React from 'react';
import type { IGenericEditComponent } from '../../componentConfig';
import type { SelectionComponentType } from '../../../../types/FormComponent';
import { useOptionListIdsQuery } from '../../../../hooks/queries/useOptionListIdsQuery';
import { ErrorMessage, Heading } from '@digdir/designsystemet-react';
import { StudioSpinner } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { OptionTabs } from './OptionTabs';
import classes from './EditOptions.module.css';

export interface ISelectionEditComponentProvidedProps<T extends SelectionComponentType>
  extends IGenericEditComponent<T> {}

export enum SelectedOptionsType {
  CodeList = 'codelist',
  Manual = 'manual',
  ReferenceId = 'referenceId',
  Unknown = '',
}

export function EditOptions<T extends SelectionComponentType>({
  component,
  handleComponentChange,
}: ISelectionEditComponentProvidedProps<T>) {
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIds, isPending, isError } = useOptionListIdsQuery(org, app);
  const { t } = useTranslation();

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
          {t('ux_editor.modal_properties_fetch_option_list_ids_error_message')}
        </ErrorMessage>
      ) : (
        <OptionTabs
          component={component}
          handleComponentChange={handleComponentChange}
          optionListIds={optionListIds}
        />
      )}
    </div>
  );
}

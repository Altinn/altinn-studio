import type { IGenericEditComponent } from '../../componentConfig';
import type { SelectionComponentType } from '../../../../types/FormComponent';
import { useOptionListIdsQuery } from '../../../../hooks/queries/useOptionListIdsQuery';
import { StudioHeading, StudioSpinner, StudioValidationMessage } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { OptionTabs } from './OptionTabs';
import classes from './EditOptions.module.css';

export interface ISelectionEditComponentProvidedProps<
  T extends SelectionComponentType,
> extends IGenericEditComponent<T> {}

export function EditOptions<T extends SelectionComponentType>({
  component,
  handleComponentChange,
}: ISelectionEditComponentProvidedProps<T>) {
  const { org, app } = useStudioEnvironmentParams();
  const { data: idsFromAppLibrary, isPending, isError } = useOptionListIdsQuery(org, app);
  const { t } = useTranslation();

  return (
    <div className={classes.root}>
      <StudioHeading level={4} data-size='xs' spacing={true} className={classes.optionsHeading}>
        {t('ux_editor.options.section_heading')}
      </StudioHeading>
      {isPending ? (
        <StudioSpinner aria-label={t('ux_editor.modal_properties_loading')} />
      ) : isError ? (
        <StudioValidationMessage className={classes.errorMessage}>
          {t('ux_editor.modal_properties_fetch_option_list_ids_error_message')}
        </StudioValidationMessage>
      ) : (
        <OptionTabs
          codeListIdContextData={{ idsFromAppLibrary, orgName: org }}
          component={component}
          handleComponentChange={handleComponentChange}
        />
      )}
    </div>
  );
}

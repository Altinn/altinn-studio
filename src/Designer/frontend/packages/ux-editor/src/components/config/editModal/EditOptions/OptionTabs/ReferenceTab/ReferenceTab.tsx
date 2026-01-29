import React, { useState } from 'react';
import type { IGenericEditComponent } from '../../../../componentConfig';
import { useTranslation } from 'react-i18next';
import { StudioAlert, StudioParagraph, StudioTextfield, StudioSpinner } from '@studio/components';
import type { SelectionComponentType } from '../../../../../../types/FormComponent';
import { useOptionListIdsQuery } from '../../../../../../hooks/queries/useOptionListIdsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { isOptionsIdReferenceId, hasStaticOptionList } from '../utils/optionsUtils';
import classes from './ReferenceTab.module.css';
import type { CodeListIdContextData } from '../types/CodeListIdContextData';

export function ReferenceTab({
  component,
  handleComponentChange,
}: IGenericEditComponent<SelectionComponentType>) {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIds, isPending } = useOptionListIdsQuery(org, app);
  const [referenceId, setReferenceId] = useState<string>(
    isOptionsIdReferenceId(optionListIds, component.optionsId) ? component.optionsId : '',
  );

  const handleOptionsIdChange = (optionsId: string) => {
    setReferenceId(optionsId);

    if (component.options) {
      delete component.options;
    }
    handleComponentChange({
      ...component,
      optionsId,
    });
  };

  if (isPending) {
    return (
      <StudioSpinner
        aria-label={t('global.loading')}
        spinnerTitle={t('ux_editor.modal_properties_loading')}
      />
    );
  }

  const contextData: CodeListIdContextData = { idsFromAppLibrary: optionListIds, orgName: org };
  const shouldDisplayAlert: boolean = hasStaticOptionList(contextData, component);

  return (
    <div className={classes.container}>
      <StudioParagraph spacing>
        {t('ux_editor.options.code_list_reference_id.description')}
      </StudioParagraph>
      <StudioParagraph spacing>
        {t('ux_editor.options.code_list_reference_id.description_details')}
      </StudioParagraph>
      <StudioTextfield
        type='text'
        label={t('ux_editor.modal_properties_custom_code_list_id')}
        onChange={(event) => handleOptionsIdChange(event.target.value)}
        value={referenceId}
      />
      {shouldDisplayAlert && (
        <StudioAlert className={classes.alert}>
          {t('ux_editor.options.tab_reference_id_alert_title')}
        </StudioAlert>
      )}
    </div>
  );
}

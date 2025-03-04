import React from 'react';
import classes from './EditPageId.module.css';
import { getPageNameErrorKey } from '../../../utils/designViewUtils';
import { StudioToggleableTextfield } from '@studio/components';
import { useTextIdMutation } from 'app-development/hooks/mutations';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext, useText } from '../../../hooks';
import { useModifyPageMutation } from '../../../hooks/mutations/useModifyPageMutation';
import { usePagesQuery } from '../../../hooks/queries/usePagesQuery';
import type { PageModel } from 'app-shared/types/api/dto/PageModel';

export interface EditPageIdProps {
  layoutName: string;
}
export const EditPageId = ({ layoutName: pageName }: EditPageIdProps) => {
  const { app, org } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { mutate: mutateTextId } = useTextIdMutation(org, app);
  const { mutate: modifyPageMutation } = useModifyPageMutation(
    org,
    app,
    selectedFormLayoutSetName,
    pageName,
  );
  const { data: pagesModel } = usePagesQuery(org, app, selectedFormLayoutSetName);
  const t = useText();

  const handleSaveNewName = (newName: string) => {
    if (newName === pageName) return;
    const newPage: PageModel = {
      id: newName,
    };
    modifyPageMutation(newPage);
    mutateTextId([{ oldId: pageName, newId: newName }]);
  };

  return (
    <div className={classes.changePageId}>
      <StudioToggleableTextfield
        customValidation={(value: string) => {
          const validationResult = getPageNameErrorKey(
            value,
            pageName,
            pagesModel?.pages?.map(({ id }) => id),
          );
          return validationResult && t(validationResult);
        }}
        label={t('ux_editor.modal_properties_textResourceBindings_page_id')}
        onBlur={(event) => handleSaveNewName(event.target.value)}
        title={t('ux_editor.modal_properties_textResourceBindings_page_id')}
        value={pageName}
      />
    </div>
  );
};

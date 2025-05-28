import React from 'react';
import classes from './EditPageId.module.css';
import { getPageNameErrorKey } from '../../../utils/designViewUtils';
import { StudioToggleableTextfield } from '@studio/components-legacy';
import { useTextIdMutation } from 'app-development/hooks/mutations';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext, useText } from '../../../hooks';
import { useModifyPageMutation } from '../../../hooks/mutations/useModifyPageMutation';
import { usePagesQuery } from '../../../hooks/queries/usePagesQuery';
import type { PageModel } from 'app-shared/types/api/dto/PageModel';
import { ItemType } from '../ItemType';

export interface EditPageIdProps {
  layoutName: string;
}
export const EditPageId = ({ layoutName: pageName }: EditPageIdProps) => {
  const { app, org } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, setSelectedFormLayoutName, setSelectedItem } = useAppContext();
  const { mutate: mutateTextId } = useTextIdMutation(org, app);
  const { mutateAsync: modifyPageMutation, isPending } = useModifyPageMutation(
    org,
    app,
    selectedFormLayoutSetName,
    pageName,
  );
  const { data: pagesModel } = usePagesQuery(org, app, selectedFormLayoutSetName);
  const t = useText();

  const handleSaveNewName = async (newName: string) => {
    if (newName === pageName) return;
    const newPage: PageModel = {
      id: newName,
    };
    mutateTextId([{ oldId: pageName, newId: newName }]);
    await modifyPageMutation(newPage);
    setSelectedFormLayoutName(newName);
    setSelectedItem({ type: ItemType.Page, id: newName });
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
        disabled={isPending}
        label={t('ux_editor.modal_properties_textResourceBindings_page_id')}
        onBlur={(event) => handleSaveNewName(event.target.value)}
        title={t('ux_editor.modal_properties_textResourceBindings_page_id')}
        value={pageName}
      />
    </div>
  );
};

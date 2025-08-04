import React from 'react';
import classes from './EditPageId.module.css';
import { getPageNameErrorKey } from '../../../utils/designViewUtils';
import { useTextIdMutation } from 'app-development/hooks/mutations';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext, useText } from '../../../hooks';
import { useModifyPageMutation } from '../../../hooks/mutations/useModifyPageMutation';
import { usePagesQuery } from '../../../hooks/queries/usePagesQuery';
import type { PageModel } from 'app-shared/types/api/dto/PageModel';
import { ItemType } from '../ItemType';
import { useChangePageGroupOrder } from '../../../hooks/mutations/useChangePageGroupOrder';
import { isPagesModelWithGroups } from 'app-shared/types/api/dto/PagesModel';
import { StudioSpinner } from '@studio/components';
import { EditName } from '../../config/EditName';

export interface EditPageIdProps {
  layoutName: string;
}
export const EditPageId = ({ layoutName: pageName }: EditPageIdProps) => {
  const { app, org } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, setSelectedFormLayoutName, setSelectedItem } = useAppContext();
  const { mutate: mutateTextId } = useTextIdMutation(org, app);
  const { mutateAsync: modifyPageMutation } = useModifyPageMutation(
    org,
    app,
    selectedFormLayoutSetName,
    pageName,
  );
  const { mutateAsync: changePageGroupOrder } = useChangePageGroupOrder(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const { data: pagesModel, isPending: pageQueryPending } = usePagesQuery(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const t = useText();

  if (pageQueryPending) return <StudioSpinner aria-label={t('general.loading')} />;
  const isUsingGroups = isPagesModelWithGroups(pagesModel);
  const pageNames = isUsingGroups
    ? pagesModel.groups.flatMap((group) => group.order)
    : pagesModel.pages;

  const handleSaveNewName = async (newName: string) => {
    if (newName === pageName) return;
    const newPage: PageModel = {
      id: newName,
    };
    mutateTextId([{ oldId: pageName, newId: newName }]);

    if (isUsingGroups) {
      const newPagesModel = {
        ...pagesModel,
        groups: pagesModel.groups.map((group) => ({
          ...group,
          order: group.order.map((page) =>
            page.id === pageName ? { ...page, id: newName } : page,
          ),
        })),
      };
      await changePageGroupOrder(newPagesModel);
    } else {
      await modifyPageMutation(newPage);
    }

    setSelectedFormLayoutName(newName);
    setSelectedItem({ type: ItemType.Page, id: newName });
  };

  const validationFn = (value: string) => {
    const validationResult = getPageNameErrorKey(
      value,
      pageName,
      pageNames.map(({ id }) => id),
    );
    return validationResult && t(validationResult);
  };

  return (
    <EditName
      className={classes.editName}
      label={t('ux_editor.modal_properties_textResourceBindings_page_id')}
      name={pageName}
      onChange={handleSaveNewName}
      validationFn={validationFn}
    />
  );
};

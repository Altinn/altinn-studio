import React from 'react';
import { StudioDeleteButton } from '@studio/components-legacy';
import { useDeleteLayoutSetMutation } from 'app-development/hooks/mutations/useDeleteLayoutSetMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { useTranslation } from 'react-i18next';
import { SubformUtils } from './SubformUtils';
import classes from './DeleteSubformWrapper.module.css';

type DeleteSubformWrapperProps = {
  layoutSets: LayoutSets;
  selectedLayoutSet: string;
};

export const DeleteSubformWrapper = ({
  layoutSets,
  selectedLayoutSet,
}: DeleteSubformWrapperProps): React.ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: deleteLayoutSet } = useDeleteLayoutSetMutation(org, app);
  const { t } = useTranslation();

  const isRegularLayoutSet = !Boolean(
    SubformUtils.findSubformById(layoutSets.sets, selectedLayoutSet),
  );
  if (isRegularLayoutSet) return;

  const onDeleteSubform = () => {
    deleteLayoutSet({ layoutSetIdToUpdate: selectedLayoutSet });
  };

  return (
    <StudioDeleteButton
      className={classes.button}
      onDelete={onDeleteSubform}
      variant='tertiary'
      confirmMessage={t('ux_editor.delete.subform.confirm')}
    >
      {t('ux_editor.delete.subform')}
    </StudioDeleteButton>
  );
};

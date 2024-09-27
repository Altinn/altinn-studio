import React from 'react';
import { StudioDeleteButton } from '@studio/components';
import { useDeleteLayoutSetMutation } from 'app-development/hooks/mutations/useDeleteLayoutSetMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { useTranslation } from 'react-i18next';
import { SubFormUtils } from './SubFormUtils';

type DeleteSubFormWrapperProps = {
  layoutSets: LayoutSets;
  selectedLayoutSet: string;
};

export const DeleteSubFormWrapper = ({
  layoutSets,
  selectedLayoutSet,
}: DeleteSubFormWrapperProps): React.ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: deleteLayoutSet } = useDeleteLayoutSetMutation(org, app);
  const { t } = useTranslation();

  const onDeleteSubForm = () => {
    deleteLayoutSet({ layoutSetIdToUpdate: selectedLayoutSet });
  };

  const isRegularLayoutSet = !Boolean(
    SubFormUtils.findSubFormById(layoutSets.sets, selectedLayoutSet),
  );

  return (
    <StudioDeleteButton
      onDelete={onDeleteSubForm}
      // Delete is only supported for sub-forms, not regular layout-sets
      disabled={isRegularLayoutSet}
      variant='tertiary'
      confirmMessage={t('ux_editor.delete.sub_form.confirm')}
    >
      {t('ux_editor.delete.sub_form')}
    </StudioDeleteButton>
  );
};

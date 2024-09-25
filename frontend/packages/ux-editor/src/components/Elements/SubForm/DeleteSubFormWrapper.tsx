import React from 'react';
import { StudioDeleteButton } from '@studio/components';
import { useDeleteLayoutSetMutation } from 'app-development/hooks/mutations/useDeleteLayoutSetMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { useTranslation } from 'react-i18next';

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
    if (confirm(t('ux_editor.delete.sub_form.confirm'))) {
      deleteLayoutSet({ layoutSetIdToUpdate: selectedLayoutSet });
    }
  };

  const isSubForm =
    layoutSets?.sets.find((set) => set.id === selectedLayoutSet)?.type === 'subform';

  return (
    <StudioDeleteButton
      onDelete={onDeleteSubForm}
      disabled={!isSubForm}
      variant='tertiary'
      confirmMessage={t('ux_editor.delete.sub_form.confirm')}
    >
      {t('ux_editor.delete.sub_form')}
    </StudioDeleteButton>
  );
};

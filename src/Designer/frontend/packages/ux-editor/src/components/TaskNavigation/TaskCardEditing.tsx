import {
  StudioButton,
  StudioParagraph,
  StudioCard,
  StudioSpinner,
  StudioTextfield,
  StudioSuggestion,
} from '@studio/components';
import { useUpdateLayoutSetIdMutation } from 'app-development/hooks/mutations/useUpdateLayoutSetIdMutation';
import { useUpdateProcessDataTypesMutation } from 'app-development/hooks/mutations/useUpdateProcessDataTypesMutation';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';
import type { UiFolderLayoutSetModel } from 'app-shared/types/api/dto/UiFolderLayoutSetModel';
import type { ChangeEvent } from 'react';
import { useState } from 'react';
import classes from './TaskCardEditing.module.css';
import { getLayoutSetTypeTranslationKey } from 'app-shared/utils/layoutSetsUtils';
import { useTranslation } from 'react-i18next';
import { CheckmarkIcon, XMarkIcon } from '@studio/icons';

export type TaskCardEditingProps = {
  layoutSetModel: UiFolderLayoutSetModel;
  onClose: () => void;
};

export const TaskCardEditing = ({ layoutSetModel, onClose }: TaskCardEditingProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();

  const { mutate: updateProcessDataType, isPending: updateProcessDataTypePending } =
    useUpdateProcessDataTypesMutation(org, app);
  const { mutate: mutateLayoutSetId, isPending: mutateLayoutSetIdPending } =
    useUpdateLayoutSetIdMutation(org, app);
  const { validateLayoutSetName } = useValidateLayoutSetName();
  const { data: dataModels } = useAppMetadataModelIdsQuery(org, app, true);
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const taskName = getLayoutSetTypeTranslationKey(layoutSetModel);
  const [id, setId] = useState(layoutSetModel.id);
  const [dataType, setDataType] = useState(layoutSetModel.dataType || '');

  const idChanged = id !== layoutSetModel.id;
  const dataTypeChanged = dataType !== layoutSetModel.dataType;
  const fieldChanged = idChanged || dataTypeChanged;

  const idValidationError = validateLayoutSetName(id, layoutSets, layoutSetModel.id);
  const pendingMutation = updateProcessDataTypePending || mutateLayoutSetIdPending;
  const disableSaveButton = !fieldChanged || Boolean(idValidationError) || pendingMutation;

  const taskNameFieldLabel =
    layoutSetModel.type === 'subform'
      ? t('ux_editor.task_card.subform_name_label')
      : t('ux_editor.task_card.task_name_label');

  const onSettled = () => {
    if (!pendingMutation) onClose();
  };

  const saveChanges = () => {
    if (dataTypeChanged) {
      if (!confirm(t('ux_editor.task_card.edit.confirm_data_model_change'))) {
        return;
      }
    }

    if (idChanged) {
      mutateLayoutSetId(
        { layoutSetIdToUpdate: layoutSetModel.id, newLayoutSetId: id },
        { onSettled },
      );
    }
    if (dataTypeChanged) {
      updateProcessDataType(
        {
          newDataTypes: [dataType],
          connectedTaskId: layoutSetModel.id,
        },
        { onSettled },
      );
    }
  };

  const availableDataModels = Array.from(
    new Set(dataType ? [dataType, ...(dataModels || [])] : dataModels || []),
  );

  return (
    <StudioCard className={classes.editCard}>
      <StudioParagraph data-size='xs'>{t(taskName)}</StudioParagraph>
      <StudioTextfield
        label={taskNameFieldLabel}
        value={id}
        error={idValidationError}
        onKeyUp={(event) => {
          if (event.key === 'Enter' && !disableSaveButton) saveChanges();
        }}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setId(event.target.value)}
      ></StudioTextfield>
      <StudioSuggestion
        multiple={false}
        label={t('ux_editor.modal_properties_data_model_binding')}
        placeholder={t('ux_editor.task_card.choose_datamodel')}
        selected={dataType}
        emptyText={t('ux_editor.task_card.no_datamodels')}
        className={classes.dataTypeSelect}
        onSelectedChange={(target) => setDataType(target.value)}
      >
        {availableDataModels?.map((option) => (
          <StudioSuggestion.Option value={option} key={option} label={option}>
            {option}
          </StudioSuggestion.Option>
        ))}
      </StudioSuggestion>
      <div className={classes.btnGroup}>
        <StudioButton
          disabled={disableSaveButton}
          icon={<CheckmarkIcon />}
          onClick={() => saveChanges()}
          variant='primary'
        >
          {pendingMutation ? <StudioSpinner aria-hidden /> : t('general.save')}
        </StudioButton>
        <StudioButton
          disabled={pendingMutation}
          icon={<XMarkIcon />}
          onClick={() => onClose()}
          variant='secondary'
        >
          {t('general.cancel')}
        </StudioButton>
      </div>
    </StudioCard>
  );
};

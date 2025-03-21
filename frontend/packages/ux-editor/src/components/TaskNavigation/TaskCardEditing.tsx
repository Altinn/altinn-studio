import {
  StudioButton,
  StudioNativeSelect,
  StudioParagraph,
  StudioSpinner,
  StudioTextfield,
} from '@studio/components';
import { useUpdateLayoutSetIdMutation } from 'app-development/hooks/mutations/useUpdateLayoutSetIdMutation';
import { useUpdateProcessDataTypesMutation } from 'app-development/hooks/mutations/useUpdateProcessDataTypesMutation';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import React, { type ChangeEvent } from 'react';
import classes from './TaskCardEditing.module.css';
import { getLayoutSetTypeTranslationKey } from 'app-shared/utils/layoutSetsUtils';
import { useTranslation } from 'react-i18next';

export type TaskCardEditingProps = {
  layoutSetModel: LayoutSetModel;
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
  const [id, setId] = React.useState(layoutSetModel.id);
  const [dataType, setDataType] = React.useState(layoutSetModel.dataType);

  const idChanged = id !== layoutSetModel.id;
  const dataTypeChanged = dataType !== layoutSetModel.dataType;
  const fieldChanged = idChanged || dataTypeChanged;

  const idValidationError = validateLayoutSetName(id, layoutSets, layoutSetModel.id);
  const pendingMutation = updateProcessDataTypePending || mutateLayoutSetIdPending;
  const disableSaveButton = !fieldChanged || Boolean(idValidationError) || pendingMutation;

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
          connectedTaskId: layoutSetModel.task?.id,
        },
        { onSettled },
      );
    }
  };

  return (
    <>
      <StudioParagraph size='xs'>{t(taskName)}</StudioParagraph>
      <StudioTextfield
        label={t('ux_editor.component_properties.layoutSet')}
        value={id}
        error={idValidationError}
        onKeyUp={(event) => {
          if (event.key === 'Enter' && !disableSaveButton) saveChanges();
        }}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setId(event.target.value)}
      ></StudioTextfield>
      <StudioNativeSelect
        label={t('ux_editor.modal_properties_data_model_binding')}
        size='sm'
        disabled={layoutSetModel.type === 'subform'}
        value={dataType}
        onChange={(event) => setDataType(event.target.value)}
      >
        <option value=''>{t('ux_editor.task_card.no_datamodel')}</option>
        {layoutSetModel.dataType && (
          <option value={layoutSetModel.dataType}>{layoutSetModel.dataType}</option>
        )}
        {dataModels?.map((dataModel) => (
          <option key={dataModel} value={dataModel}>
            {dataModel}
          </option>
        ))}
      </StudioNativeSelect>
      <div className={classes.btnGroup}>
        <StudioButton disabled={disableSaveButton} onClick={() => saveChanges()} variant='primary'>
          {pendingMutation ? <StudioSpinner size='xs' spinnerTitle='' /> : t('general.save')}
        </StudioButton>
        <StudioButton disabled={pendingMutation} onClick={() => onClose()} variant='secondary'>
          {t('general.close')}
        </StudioButton>
      </div>
    </>
  );
};

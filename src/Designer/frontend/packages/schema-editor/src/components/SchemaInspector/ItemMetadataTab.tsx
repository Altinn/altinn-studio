import { StudioErrorMessage } from '@studio/components-legacy';
import { StudioSpinner, StudioFieldset, StudioSwitch, StudioTextfield } from '@studio/components';
import { useDataTypeQuery } from 'app-shared/hooks/queries/useDataTypeQuery';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useDebounce } from '@studio/hooks';
import type { DataType } from 'app-shared/types/DataType';
import { useUpdateDataTypeMutation } from 'app-shared/hooks/mutations/useUpdateDataTypeMutation';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

export const ItemMetadataTab = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { name: modelName } = useSchemaEditorAppContext();
  const { debounce } = useDebounce({ debounceTimeInMs: AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS });

  const { data: dataType, isPending } = useDataTypeQuery(org, app, modelName);
  const { mutate: mutateDataType } = useUpdateDataTypeMutation(org, app, modelName);
  const queryClient = useQueryClient();

  const saveMetadata = (updatedDataType: DataType) => {
    queryClient.setQueryData([QueryKey.DataType, org, app, modelName], updatedDataType);
    debounce(() => {
      mutateDataType(updatedDataType);
    });
  };

  if (isPending) {
    return <StudioSpinner aria-hidden spinnerTitle={t('general.loading')}></StudioSpinner>;
  }

  if (!dataType) {
    return <StudioErrorMessage>{t('schema_editor.metadata.not_found')}</StudioErrorMessage>;
  }

  const hasMaxCountError =
    dataType.maxCount < 0 || (dataType.maxCount < dataType.minCount && dataType.maxCount !== 0);
  const hasMinCountError =
    dataType.minCount < 0 || (dataType.minCount > dataType.maxCount && dataType.maxCount !== 0);

  return (
    <StudioFieldset legend={t('schema_editor.metadata')}>
      <StudioTextfield
        label={t('schema_editor.metadata.maxCount')}
        value={dataType.maxCount}
        type='number'
        max={Number.MAX_SAFE_INTEGER}
        min={dataType.minCount || 0}
        error={hasMaxCountError ? t('schema_editor.metadata.maxCount.error') : undefined}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          const maxCount = parseInt(event.target.value) || 0;
          const updatedDataType = { ...dataType, maxCount };
          saveMetadata(updatedDataType);
        }}
      />
      <StudioTextfield
        label={t('schema_editor.metadata.minCount')}
        value={dataType.minCount}
        type='number'
        max={dataType.maxCount || Number.MAX_SAFE_INTEGER}
        min={0}
        error={hasMinCountError ? t('schema_editor.metadata.minCount.error') : undefined}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          const minCount = parseInt(event.target.value) || 0;
          const updatedDataType = { ...dataType, minCount };
          saveMetadata(updatedDataType);
        }}
      />
      {dataType.appLogic && (
        <StudioSwitch
          label={t('schema_editor.metadata.autoCreate')}
          checked={dataType.appLogic.autoCreate}
          onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
            const updatedAppLogic = { ...dataType.appLogic, autoCreate: event.target.checked };
            const updatedDataType = { ...dataType, appLogic: updatedAppLogic };
            saveMetadata(updatedDataType);
          }}
        ></StudioSwitch>
      )}
    </StudioFieldset>
  );
};

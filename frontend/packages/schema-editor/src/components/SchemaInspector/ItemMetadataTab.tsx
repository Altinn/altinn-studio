import { StudioFieldset, StudioSwitch, StudioTextfield } from '@studio/components';
import { useDataTypeQuery } from 'app-shared/hooks/queries/useDataTypeQuery';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useDebounce } from '@studio/hooks';
import type { DataType } from 'app-shared/types/DataType';
import { useUpdateDataTypeMutation } from 'app-shared/hooks/mutations/useUpdateDataTypeMutation';

export const ItemMetadataTab = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { name: modelName } = useSchemaEditorAppContext();
  const { debounce } = useDebounce({ debounceTimeInMs: 500 });

  const { data: dataType, isPending } = useDataTypeQuery(org, app, modelName);
  const { mutate: mutateDataType } = useUpdateDataTypeMutation(org, app, modelName);

  const saveMetadata = (updatedDataType: DataType) => {
    debounce(() => {
      mutateDataType(updatedDataType);
    });
  };

  if (isPending) {
    return <div>{t('general.loading')}</div>;
  }

  if (!dataType) {
    return <div>{t('schema_editor.metadata.not_found')}</div>;
  }

  return (
    <StudioFieldset legend={t('schema_editor.metadata')}>
      <StudioTextfield
        label={t('schema_editor.metadata.maxCount')}
        value={dataType.maxCount}
        type='number'
        max={Number.MAX_SAFE_INTEGER}
        min={dataType.minCount}
        error={
          dataType.maxCount < dataType.minCount ? t('schema_editor.metadata.maxCount.error') : false
        }
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          dataType.maxCount = parseInt(event.target.value);
          saveMetadata(dataType);
        }}
      />
      <StudioTextfield
        label={t('schema_editor.metadata.minCount')}
        value={dataType.minCount}
        type='number'
        max={dataType.maxCount}
        min={0}
        error={
          dataType.minCount > dataType.maxCount ? t('schema_editor.metadata.minCount.error') : false
        }
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          dataType.minCount = parseInt(event.target.value);
          saveMetadata(dataType);
        }}
      />
      {dataType.appLogic && (
        <StudioSwitch
          checked={dataType.appLogic.autoCreate}
          onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
            dataType.appLogic.autoCreate = event.target.checked;
            saveMetadata(dataType);
          }}
        >
          {t('schema_editor.metadata.autoCreate')}
        </StudioSwitch>
      )}
    </StudioFieldset>
  );
};

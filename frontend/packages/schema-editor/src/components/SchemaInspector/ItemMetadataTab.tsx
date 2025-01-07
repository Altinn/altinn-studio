import {
  StudioErrorMessage,
  StudioFieldset,
  StudioSpinner,
  StudioSwitch,
  StudioTextfield,
} from '@studio/components';
import { useDataTypeQuery } from 'app-shared/hooks/queries/useDataTypeQuery';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useDebounce } from '@studio/hooks';
import type { DataType } from 'app-shared/types/DataType';
import { useUpdateDataTypeMutation } from 'app-shared/hooks/mutations/useUpdateDataTypeMutation';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';

export const ItemMetadataTab = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { name: modelName } = useSchemaEditorAppContext();
  const { debounce } = useDebounce({ debounceTimeInMs: AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS });

  const { data: dataType, isPending } = useDataTypeQuery(org, app, modelName);
  const { mutate: mutateDataType } = useUpdateDataTypeMutation(org, app, modelName);

  const saveMetadata = (updatedDataType: DataType) => {
    debounce(() => {
      mutateDataType(updatedDataType);
    });
  };

  if (isPending) {
    return <StudioSpinner spinnerTitle={t('general.loading')}></StudioSpinner>;
  }

  if (!dataType) {
    return <StudioErrorMessage>{t('schema_editor.metadata.not_found')}</StudioErrorMessage>;
  }

  return (
    <StudioFieldset legend={t('schema_editor.metadata')}>
      <StudioTextfield
        label={t('schema_editor.metadata.maxCount')}
        value={dataType.maxCount || 0}
        type='number'
        max={Number.MAX_SAFE_INTEGER}
        min={dataType.minCount || 0}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          const updatedDataType = { ...dataType, maxCount: parseInt(event.target.value) };
          saveMetadata(updatedDataType);
        }}
      />
      <StudioTextfield
        label={t('schema_editor.metadata.minCount')}
        value={dataType.minCount || 0}
        type='number'
        max={dataType.maxCount || Number.MAX_SAFE_INTEGER}
        min={0}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          const updatedDataType = { ...dataType, minCount: parseInt(event.target.value) };
          saveMetadata(updatedDataType);
        }}
      />
      {dataType.appLogic && (
        <StudioSwitch
          checked={dataType.appLogic.autoCreate}
          onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
            const updatedAppLogic = { ...dataType.appLogic, autoCreate: event.target.checked };
            const updatedDataType = { ...dataType, appLogic: updatedAppLogic };
            saveMetadata(updatedDataType);
          }}
        >
          {t('schema_editor.metadata.autoCreate')}
        </StudioSwitch>
      )}
    </StudioFieldset>
  );
};

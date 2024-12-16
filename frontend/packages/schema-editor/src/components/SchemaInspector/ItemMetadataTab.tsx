import { StudioFieldset, StudioSwitch, StudioTextfield } from '@studio/components';
import { useDataTypeQuery } from 'app-shared/hooks/queries/useDataTypeQuery';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useDebounce } from '@studio/hooks';
import type { DataType } from 'app-shared/types/DataType';

export const ItemMetadataTab = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { name: modelName } = useSchemaEditorAppContext();
  const { debounce } = useDebounce({ debounceTimeInMs: 500 });

  const { data: dataType, isPending } = useDataTypeQuery(org, app, modelName);

  const saveMetadata = (updatedDataType: DataType) => {
    debounce(() => {
      console.log('Saving metadata', updatedDataType);
    });
  };

  if (isPending) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <StudioFieldset legend={t('schema_editor.metadata')}>
      <StudioTextfield
        label={t('schema_editor.metadata.maxCount')}
        value={dataType.maxCount}
        type='number'
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          dataType.maxCount = event.target.value;
          saveMetadata(dataType);
        }}
      />
      <StudioTextfield
        label={t('schema_editor.metadata.minCount')}
        value={dataType.minCount}
        type='number'
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          dataType.minCount = event.target.value;
          saveMetadata(dataType);
        }}
      />
      <StudioSwitch
        value={dataType.appLogic.autoCreate}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          dataType.appLogic.autoCreate = event.target.checked;
          saveMetadata(dataType);
        }}
      >
        {t('schema_editor.metadata.autoCreate')}
      </StudioSwitch>
    </StudioFieldset>
  );
};

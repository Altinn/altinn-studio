import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioFieldset, StudioSelect, StudioTextfield } from '@studio/components';
import { schemaPointerToDataBindingName } from '@altinn/schema-model';
import { PrefillSource } from 'app-shared/types/PrefillConfig';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { findPrefillMapping, removePrefillMapping, setPrefillMapping } from './prefillConfigUtils';
import { PREFILL_SOURCE_FIELDS } from './prefillSourceFields';
import classes from './PrefillSection.module.css';

export interface PrefillSectionProps {
  schemaPointer: string;
}

export const PrefillSection = ({ schemaPointer }: PrefillSectionProps) => {
  const { t } = useTranslation();
  const { prefillConfig, savePrefillConfig } = useSchemaEditorAppContext();
  const dataBindingName = schemaPointerToDataBindingName(schemaPointer);
  const currentMapping = findPrefillMapping(prefillConfig, dataBindingName);

  const [selectedSource, setSelectedSource] = useState<PrefillSource | ''>(
    currentMapping?.source ?? '',
  );
  const [queryParameterName, setQueryParameterName] = useState<string>(
    currentMapping?.source === PrefillSource.QueryParameters ? currentMapping.key : '',
  );

  const handleSourceChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newSource = event.target.value as PrefillSource | '';
    setSelectedSource(newSource);
    setQueryParameterName('');
    savePrefillConfig(removePrefillMapping(prefillConfig, dataBindingName));
  };

  const handleSourceFieldChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const fieldKey = event.target.value;
    if (!fieldKey) {
      savePrefillConfig(removePrefillMapping(prefillConfig, dataBindingName));
      return;
    }
    savePrefillConfig(
      setPrefillMapping(prefillConfig, dataBindingName, selectedSource as PrefillSource, fieldKey),
    );
  };

  const handleQueryParameterNameBlur = () => {
    if (!queryParameterName) {
      savePrefillConfig(removePrefillMapping(prefillConfig, dataBindingName));
      return;
    }
    savePrefillConfig(
      setPrefillMapping(
        prefillConfig,
        dataBindingName,
        PrefillSource.QueryParameters,
        queryParameterName,
      ),
    );
  };

  const selectedField = currentMapping?.source === selectedSource ? currentMapping.key : '';

  return (
    <StudioFieldset
      className={classes.root}
      legend={t('schema_editor.prefill.legend')}
      description={t('schema_editor.prefill.help')}
    >
      <StudioSelect
        label={t('schema_editor.prefill.source')}
        onChange={handleSourceChange}
        value={selectedSource}
      >
        <StudioSelect.Option value=''>{t('schema_editor.prefill.source_none')}</StudioSelect.Option>
        {Object.values(PrefillSource).map((source) => (
          <StudioSelect.Option key={source} value={source}>
            {t(`schema_editor.prefill.source_${source.toLowerCase()}`)}
          </StudioSelect.Option>
        ))}
      </StudioSelect>
      {selectedSource && selectedSource !== PrefillSource.QueryParameters && (
        <StudioSelect
          label={t('schema_editor.prefill.field')}
          onChange={handleSourceFieldChange}
          value={selectedField}
        >
          <StudioSelect.Option value=''>
            {t('schema_editor.prefill.field_placeholder')}
          </StudioSelect.Option>
          {PREFILL_SOURCE_FIELDS[selectedSource].map((field) => (
            <StudioSelect.Option key={field} value={field}>
              {field}
            </StudioSelect.Option>
          ))}
        </StudioSelect>
      )}
      {selectedSource === PrefillSource.QueryParameters && (
        <StudioTextfield
          label={t('schema_editor.prefill.query_parameter')}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setQueryParameterName(event.target.value)
          }
          onBlur={handleQueryParameterNameBlur}
          value={queryParameterName}
        />
      )}
    </StudioFieldset>
  );
};

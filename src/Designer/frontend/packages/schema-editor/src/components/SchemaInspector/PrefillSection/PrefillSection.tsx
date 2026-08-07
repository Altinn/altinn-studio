import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioFieldset, StudioSelect, StudioTextfield } from '@studio/components';
import type { PrefillMapping } from '@altinn/schema-model';
import {
  mergePrefillConfig,
  schemaPointerToDataBindingName,
  SchemaModel,
} from '@altinn/schema-model';
import type { PrefillConfig } from 'app-shared/types/PrefillConfig';
import { PrefillSource } from 'app-shared/types/PrefillConfig';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { removePrefillMapping, setPrefillMapping } from './prefillConfigUtils';
import { PREFILL_SOURCE_FIELDS } from './prefillSourceFields';
import classes from './PrefillSection.module.css';

export interface PrefillSectionProps {
  schemaPointer: string;
  prefill?: PrefillMapping;
}

export const PrefillSection = ({ schemaPointer, prefill: currentMapping }: PrefillSectionProps) => {
  const { t } = useTranslation();
  const { schemaModel, save, prefillConfig, savePrefillConfig } = useSchemaEditorAppContext();
  const dataBindingName = schemaPointerToDataBindingName(schemaPointer);

  const [selectedSource, setSelectedSource] = useState<PrefillSource | ''>(
    currentMapping?.source ?? '',
  );
  const [queryParameterName, setQueryParameterName] = useState<string>(
    currentMapping?.source === PrefillSource.QueryParameters ? currentMapping.key : '',
  );

  // Saving the prefill config alone isn't enough: the internal schema model caches each field's
  // prefill mapping directly on the node (see mergePrefillConfig) so the UI doesn't need to search
  // the whole prefill config every time a field is selected. That cache must be refreshed from the
  // updated config whenever a mapping changes, or it would go stale (e.g. if this change reassigns
  // a source/key pair away from another field that previously held it).
  const updatePrefillConfig = (updatedConfig: PrefillConfig) => {
    savePrefillConfig(updatedConfig);
    save(SchemaModel.fromArray(mergePrefillConfig(schemaModel.asArray(), updatedConfig)));
  };

  const handleSourceChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newSource = event.target.value as PrefillSource | '';
    setSelectedSource(newSource);
    setQueryParameterName('');
    updatePrefillConfig(removePrefillMapping(prefillConfig, dataBindingName));
  };

  const handleSourceFieldChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const fieldKey = event.target.value;
    if (!fieldKey) {
      updatePrefillConfig(removePrefillMapping(prefillConfig, dataBindingName));
      return;
    }
    updatePrefillConfig(
      setPrefillMapping(prefillConfig, dataBindingName, selectedSource as PrefillSource, fieldKey),
    );
  };

  const handleQueryParameterNameBlur = () => {
    if (!queryParameterName) {
      updatePrefillConfig(removePrefillMapping(prefillConfig, dataBindingName));
      return;
    }
    updatePrefillConfig(
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

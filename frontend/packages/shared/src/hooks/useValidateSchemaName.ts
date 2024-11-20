import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useAppMetadataQuery,
  useDataModelsJsonQuery,
  useDataModelsXsdQuery,
} from '../hooks/queries';
import { useStudioEnvironmentParams } from '../hooks/useStudioEnvironmentParams';
import type { DataModelMetadata } from '../types/DataModelMetadata';
import type { ApplicationMetadata, DataTypeElement } from '../types/ApplicationMetadata';
import {
  extractModelNamesFromMetadataList,
  mergeJsonAndXsdData,
} from '../../../../app-development/utils/metadataUtils';

export const useValidateSchemaName = () => {
  const [nameError, setNameError] = useState('');
  const { org, app } = useStudioEnvironmentParams();
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const { data: jsonData } = useDataModelsJsonQuery(org, app);
  const { data: xsdData } = useDataModelsXsdQuery(org, app);
  const { t } = useTranslation();

  const dataModels = useMemo(() => mergeJsonAndXsdData(jsonData, xsdData), [jsonData, xsdData]);

  const validateName = (name: string): void => {
    if (!name) {
      setNameError(t('validation_errors.required'));
      return;
    }
    if (!name.match(SCHEMA_NAME_REGEX)) {
      setNameError(t('schema_editor.error_invalid_datamodel_name'));
      return;
    }
    if (name.length > SCHEMA_NAME_MAX_LENGTH) {
      setNameError(t('validation_errors.maxLength', { number: SCHEMA_NAME_MAX_LENGTH }));
      return;
    }
    if (isExistingModelName(name, dataModels)) {
      setNameError(t('schema_editor.error_model_name_exists', { newModelName: name }));
      return;
    }
    if (isExistingDataTypeName(name, appMetadata)) {
      setNameError(t('schema_editor.error_data_type_name_exists'));
      return;
    }
    if (isCSharpReservedKeyword(name)) {
      setNameError(t('schema_editor.error_reserved_keyword'));
      return;
    }
    setNameError('');
  };

  return { validateName, nameError, setNameError };
};

export const SCHEMA_NAME_MAX_LENGTH: number = 100;
const SCHEMA_NAME_REGEX: RegExp = /^[a-zA-Z][a-zA-Z0-9_\-æÆøØåÅ]*$/;

const isExistingDataTypeName = (id: string, appMetaData: ApplicationMetadata): DataTypeElement => {
  return appMetaData?.dataTypes?.find(
    (dataType: DataTypeElement) => dataType.id.toLowerCase() === id.toLowerCase(),
  );
};

const isExistingModelName = (name: string, dataModels: DataModelMetadata[]): boolean => {
  const modelNames = extractModelNamesFromMetadataList(dataModels);
  return modelNames.includes(name);
};

const isCSharpReservedKeyword = (word: string): boolean => {
  const cSharpKeywords = new Set([
    'abstract',
    'as',
    'base',
    'bool',
    'break',
    'byte',
    'case',
    'catch',
    'char',
    'checked',
    'class',
    'const',
    'continue',
    'decimal',
    'default',
    'delegate',
    'do',
    'double',
    'else',
    'enum',
    'event',
    'explicit',
    'extern',
    'false',
    'finally',
    'fixed',
    'float',
    'for',
    'foreach',
    'goto',
    'if',
    'implicit',
    'in',
    'int',
    'interface',
    'internal',
    'is',
    'lock',
    'long',
    'namespace',
    'new',
    'null',
    'object',
    'operator',
    'out',
    'override',
    'params',
    'private',
    'protected',
    'public',
    'readonly',
    'ref',
    'return',
    'sbyte',
    'sealed',
    'short',
    'sizeof',
    'stackalloc',
    'static',
    'string',
    'struct',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'uint',
    'ulong',
    'unchecked',
    'unsafe',
    'ushort',
    'using',
    'virtual',
    'void',
    'volatile',
    'while',
  ]);

  return cSharpKeywords.has(word);
};

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DATA_MODEL_NAME_REGEX } from 'app-shared/constants';
import { StringUtils } from 'libs/studio-pure-functions/src';

export const useValidateSchemaName = (
  existingDataModelNames: string[],
  existingDataTypeNames: string[],
) => {
  const [nameError, setNameError] = useState('');
  const { t } = useTranslation();

  const validateName = (name: string): void => {
    if (!name) {
      setNameError(t('validation_errors.required'));
      return;
    }
    if (!name.match(DATA_MODEL_NAME_REGEX)) {
      setNameError(t('schema_editor.error_invalid_datamodel_name'));
      return;
    }
    if (name.length > DATA_MODEL_NAME_MAX_LENGTH) {
      setNameError(t('validation_errors.maxLength', { number: DATA_MODEL_NAME_MAX_LENGTH }));
      return;
    }
    if (
      existingDataModelNames.some((dataModelName) =>
        StringUtils.areCaseInsensitiveEqual(dataModelName, name),
      )
    ) {
      setNameError(t('schema_editor.error_model_name_exists', { newModelName: name }));
      return;
    }
    if (
      existingDataTypeNames.some((dataTypeName) =>
        StringUtils.areCaseInsensitiveEqual(dataTypeName, name),
      )
    ) {
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

export const DATA_MODEL_NAME_MAX_LENGTH = 100;

export const isCSharpReservedKeyword = (word: string): boolean => {
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

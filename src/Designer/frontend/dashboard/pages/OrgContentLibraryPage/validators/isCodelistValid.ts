import Ajv from 'ajv';
import type { CodeList } from '@studio/components';
import codelistSchema from './codelist.schema.v1.json';

export const isCodeListValid = (codeList: unknown): codeList is CodeList => {
  const ajv = new Ajv({ strict: false });
  const validate = ajv.compile<CodeList>(codelistSchema);
  return validate(codeList);
};

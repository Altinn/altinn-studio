import Ajv from 'ajv';
import type { CodeList } from '@studio/components';
import codelistSchema from './codelist.schema.v1.json';

const ajv = new Ajv({ strict: false });
const validate = ajv.compile<CodeList>(codelistSchema);

export const isCodeListValid = (codeList: unknown): codeList is CodeList => validate(codeList);

import { testSchemaNodes } from '@altinn/schema-model/index';
import { schemaNodesMock } from './test-data';

describe('schemaNodesMock', () => testSchemaNodes(schemaNodesMock));

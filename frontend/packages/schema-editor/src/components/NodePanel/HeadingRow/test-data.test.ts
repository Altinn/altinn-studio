import { testSchemaNodes } from '@altinn/schema-model';
import { schemaNodesMock } from './test-data';

describe('schemaNodesMock', () => testSchemaNodes(schemaNodesMock));

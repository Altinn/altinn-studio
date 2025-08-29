import { uiSchemaNodesMock } from './uiSchemaMock';
import { testSchemaNodes } from '@altinn/schema-model';

/**
 * Verify that the uiSchemaMock is valid.
 * Tests that depend on this mock relies on these tests to pass.
 */
describe('uiSchemaNodesMock', () => testSchemaNodes(uiSchemaNodesMock));

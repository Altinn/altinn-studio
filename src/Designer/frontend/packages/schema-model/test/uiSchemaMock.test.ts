import { uiSchemaMock } from './uiSchemaMock';
import { testSchemaNodes } from './validateTestUiSchema';

/**
 * Verify that the uiSchemaMock is valid.
 * Tests that depend on this mock relies on these tests to pass.
 */
describe('uiSchemaMock', () => testSchemaNodes(uiSchemaMock));

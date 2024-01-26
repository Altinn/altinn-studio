import type { UiSchemaNodes } from '../../types';
import { nodeMockBase } from '../../../test/uiSchemaMock';
import { getPointers } from './getPointers';

describe('getPointers', () => {
  it('Returns an array of the pointers from the given schema', () => {
    const pointers = ['test1', 'test2', 'test3'];
    const schema: UiSchemaNodes = pointers.map((pointer) => ({
      ...nodeMockBase,
      pointer,
    }));
    expect(getPointers(schema)).toStrictEqual(pointers);
  });
});

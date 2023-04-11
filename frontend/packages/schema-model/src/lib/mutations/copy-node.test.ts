import { copyNodePointer } from './copy-node';
import { buildUiSchema } from '../build-ui-schema';
import { FieldType, Keywords } from '../types';
import { makePointer as p } from '../utils';
import { getRootNode } from '../selectors';

const { Properties, Type } = Keywords;
test('that it can copy nodes', () => {
  const uiSchemaNodes = buildUiSchema({
    [Properties]: {
      email: { [Type]: FieldType.String },
    },
  });
  const mutatedNodes = copyNodePointer(
    uiSchemaNodes,
    p(Properties, 'email'),
    p(Properties, 'copiedEmail')
  );
  expect(mutatedNodes).toHaveLength(3);
  expect(getRootNode(mutatedNodes).children).toHaveLength(2);
});

import { buildUiSchema } from '../build-ui-schema';
import { Keyword } from '../../types';
import { findRequiredProps } from './required';
import { getParentNodeByPointer } from '../selectors';

test('that we find required props', () => {
  const expected = ['world'];
  const uiNodeMap = buildUiSchema({
    [Keyword.Properties]: {
      hello: {},
      world: {},
    },
    [Keyword.Required]: expected,
  });
  const parentNode = getParentNodeByPointer(uiNodeMap, '#/properties/world');

  expect(findRequiredProps(uiNodeMap, parentNode.schemaPointer)).toEqual(expected);
});

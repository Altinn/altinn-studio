import { buildUiSchema } from '../build-ui-schema';
import { Keywords } from '../types';
import { findRequiredProps } from './required';
import { getParentNodeByPointer } from '../utils';

test('that we find required props', () => {
  const expected = ['world'];
  const uiNodeMap = buildUiSchema({
    [Keywords.Properties]: {
      hello: {},
      world: {},
    },
    [Keywords.Required]: expected,
  });
  const parentNode = getParentNodeByPointer(uiNodeMap, '#/properties/world');

  expect(findRequiredProps(uiNodeMap, parentNode.nodeId)).toEqual(expected);
});

import { copyNodePointer } from './copy-node';
import { buildUiSchema } from '../build-ui-schema';
import { FieldType, Keyword } from '../../types';
import { getRootNode } from '../selectors';
import { makePointerFromArray } from '../pointerUtils';

const { Properties, Type } = Keyword;

describe('copyNodePointer', () => {
  it('Can copy nodes', () => {
    const uiSchemaNodes = buildUiSchema({
      [Properties]: {
        email: { [Type]: FieldType.String },
      },
    });
    const mutatedNodes = copyNodePointer(
      uiSchemaNodes,
      makePointerFromArray([Properties, 'email']),
      makePointerFromArray([Properties, 'copiedEmail']),
    );
    expect(mutatedNodes).toHaveLength(3);
    expect(getRootNode(mutatedNodes).children).toHaveLength(2);
  });
});

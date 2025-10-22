import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { getRecursiveValidations, makeComponentIdIndex } from 'src/features/validation/ValidationStorePlugin';
import { NodeData } from 'src/utils/layout/types';
import type { NodeRefValidation } from 'src/features/validation';
import type { ILayouts } from 'src/layout/layout';
import type { NodesContext } from 'src/utils/layout/NodesContext';

function createNodeWithValidation(id: string, baseId: string, errorMessage: string): NodeData {
  return {
    id,
    baseId,
    pageKey: 'FormLayout',
    isValid: true,
    validations: [
      {
        message: { key: errorMessage },
        severity: 'error' as const,
        source: FrontendValidationSource.Component,
        category: ValidationMask.Component,
      },
    ],
    validationVisibility: ValidationMask.Component,
    initialVisibility: 0,
    hidden: false,
  } as unknown as NodeData;
}

function createParentNode(id: string, baseId: string): NodeData {
  return {
    id,
    baseId,
    pageKey: 'FormLayout',
    isValid: true,
    validations: [],
    validationVisibility: 0,
    initialVisibility: 0,
    hidden: false,
  } as unknown as NodeData;
}

describe('ValidationStorePlugin', () => {
  describe('getRecursiveValidations', () => {
    it('should not match multi-digit row indexes when looking for single-digit row (regression test for -10, -11, -12 matching -1)', () => {
      const layouts: ILayouts = {
        FormLayout: [
          {
            id: 'myGroup',
            type: 'RepeatingGroup',
            dataModelBindings: {
              group: { dataType: defaultDataTypeMock, field: 'Group' },
            },
            children: ['field1'],
          },
          {
            id: 'field1',
            type: 'Input',
            dataModelBindings: {
              simpleBinding: { dataType: defaultDataTypeMock, field: 'Group.prop1' },
            },
            textResourceBindings: {
              title: 'Field 1',
            },
            readOnly: false,
            required: false,
          },
        ],
      };

      const lookups = makeLayoutLookups(layouts);
      const nodeData: NodesContext['nodeData'] = {};
      for (let i = 1; i <= 200; i++) {
        nodeData[`myGroup-${i}`] = createParentNode(`myGroup-${i}`, 'myGroup');
        nodeData[`field1-${i}`] = createNodeWithValidation(`field1-${i}`, 'field1', `Error in row ${i}`);
      }

      const state = { nodeData } as NodesContext;
      const baseToIndexedMap = makeComponentIdIndex(state);
      const output: NodeRefValidation[] = [];

      // Get recursive validations for myGroup-1 without restriction (get all children)
      getRecursiveValidations({
        id: 'myGroup',
        baseId: 'myGroup',
        state,
        mask: ValidationMask.Component,
        severity: 'error',
        includeSelf: false,
        restriction: 1,
        lookups,
        baseToIndexedMap,
        output,
      });

      expect(output).toHaveLength(1);
      expect(output[0].nodeId).toBe('field1-1');
      expect(output[0].message.key).toBe('Error in row 1');
    });

    it('should correctly match nested children with multi-digit indexes', () => {
      const layouts: ILayouts = {
        FormLayout: [
          {
            id: 'mainGroup',
            type: 'RepeatingGroup',
            dataModelBindings: {
              group: { dataType: defaultDataTypeMock, field: 'MainGroup' },
            },
            children: ['subGroup'],
          },
          {
            id: 'subGroup',
            type: 'RepeatingGroup',
            dataModelBindings: {
              group: { dataType: defaultDataTypeMock, field: 'MainGroup.SubGroup' },
            },
            children: ['field1'],
          },
          {
            id: 'field1',
            type: 'Input',
            dataModelBindings: {
              simpleBinding: { dataType: defaultDataTypeMock, field: 'MainGroup.SubGroup.prop1' },
            },
            textResourceBindings: {
              title: 'Field 1',
            },
            readOnly: false,
            required: false,
          },
        ],
      };

      const lookups = makeLayoutLookups(layouts);
      const nodeData: NodesContext['nodeData'] = {};
      for (let parentRow = 1; parentRow <= 20; parentRow++) {
        nodeData[`mainGroup-${parentRow}`] = createParentNode(`mainGroup-${parentRow}`, 'mainGroup');

        for (let childRow = 1; childRow <= 20; childRow++) {
          nodeData[`subGroup-${parentRow}-${childRow}`] = createParentNode(
            `subGroup-${parentRow}-${childRow}`,
            'subGroup',
          );
          nodeData[`field1-${parentRow}-${childRow}`] = createNodeWithValidation(
            `field1-${parentRow}-${childRow}`,
            'field1',
            `Error in nested row ${parentRow}-${childRow}`,
          );
        }
      }

      const state = { nodeData } as NodesContext;
      const baseToIndexedMap = makeComponentIdIndex(state);
      const output: NodeRefValidation[] = [];

      getRecursiveValidations({
        id: 'mainGroup-2',
        baseId: 'mainGroup',
        state,
        mask: ValidationMask.Component,
        severity: 'error',
        includeSelf: false,
        restriction: 1,
        lookups,
        baseToIndexedMap,
        output,
      });

      expect(output).toHaveLength(1);
      expect(output[0].nodeId).toBe('field1-2-1');
      expect(output[0].message.key).toBe('Error in nested row 2-1');
    });
  });
});

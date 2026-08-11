import type { PrefillConfig } from 'app-shared/types/PrefillConfig';
import { PrefillSource } from 'app-shared/types/PrefillConfig';
import type { UiSchemaNodes } from '../../types';
import { CombinationKind, FieldType, ObjectKind } from '../../types';
import type { CombinationNode } from '../../types/CombinationNode';
import type { FieldNode } from '../../types/FieldNode';
import { mergePrefillConfig } from './prefill';

const stringFieldNode: FieldNode = {
  objectKind: ObjectKind.Field,
  fieldType: FieldType.String,
  schemaPointer: '#/properties/orgNumberField',
  isRequired: false,
  isNillable: false,
  isArray: false,
  children: [],
  custom: {},
  restrictions: {},
  implicitType: true,
};

const otherFieldNode: FieldNode = {
  ...stringFieldNode,
  schemaPointer: '#/properties/otherField',
};

const combinationNode: CombinationNode = {
  objectKind: ObjectKind.Combination,
  combinationType: CombinationKind.AnyOf,
  schemaPointer: '#/properties/combinationField',
  isRequired: false,
  isNillable: false,
  isArray: false,
  children: [],
  custom: {},
  restrictions: {},
  implicitType: true,
};

describe('mergePrefillConfig', () => {
  it('Attaches the matching prefill mapping to a field node', () => {
    const prefillConfig: PrefillConfig = { ER: { OrgNumber: 'orgNumberField' } };
    const nodes: UiSchemaNodes = [stringFieldNode, otherFieldNode];
    const result = mergePrefillConfig(nodes, prefillConfig);
    expect(result.find((node) => node.schemaPointer === stringFieldNode.schemaPointer)).toEqual({
      ...stringFieldNode,
      prefill: { source: PrefillSource.ER, key: 'OrgNumber' },
    });
    expect(result.find((node) => node.schemaPointer === otherFieldNode.schemaPointer)).toEqual(
      otherFieldNode,
    );
  });

  it('Attaches a QueryParameters mapping to a field node', () => {
    const prefillConfig: PrefillConfig = { QueryParameters: { caseId: 'orgNumberField' } };
    const result = mergePrefillConfig([stringFieldNode], prefillConfig);
    expect(result[0]).toEqual({
      ...stringFieldNode,
      prefill: { source: PrefillSource.QueryParameters, key: 'caseId' },
    });
  });

  it('Clears a previously attached mapping that the config no longer defines', () => {
    const nodeWithStalePrefill: FieldNode = {
      ...stringFieldNode,
      prefill: { source: PrefillSource.ER, key: 'OrgNumber' },
    };
    const result = mergePrefillConfig([nodeWithStalePrefill], {});
    expect(result[0]).toEqual(stringFieldNode);
  });

  it('Leaves non-field nodes untouched', () => {
    const prefillConfig: PrefillConfig = { ER: { OrgNumber: 'combinationField' } };
    const result = mergePrefillConfig([combinationNode], prefillConfig);
    expect(result[0]).toEqual(combinationNode);
  });

  it('Returns the nodes unchanged when the prefill config is empty', () => {
    const nodes: UiSchemaNodes = [stringFieldNode, otherFieldNode];
    expect(mergePrefillConfig(nodes, {})).toEqual(nodes);
  });
});

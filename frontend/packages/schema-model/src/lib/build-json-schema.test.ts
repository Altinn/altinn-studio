import { buildJsonSchema } from '@altinn/schema-model';
import { expect } from '@jest/globals';
import type { UiSchemaNodes } from '../types';
import { act } from 'react-dom/test-utils';

describe('buildJsonSchema', () => {
  it("should return valid output", () => {
    testCases.forEach(testCase => {
      act(() => {
        const out = buildJsonSchema(testCase as UiSchemaNodes);
        expect(out.properties.foo.properties).toBeUndefined();
        expect(out.properties.foo.items.properties).toBeDefined();
      });
    });
  });
});

const testCases = [[{ "objectKind": "field", "fieldType": "object", "pointer": "#", "isRequired": false, "isNillable": false, "isCombinationItem": false, "isArray": false, "children": ["#/properties/foo"], "custom": { "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "http://studio-repositories:3000/JamalAlAbdullah/test-app2/App/models/test4.schema.json", "info": { "rootNode": "" }, "@xsdNamespaces": { "xsd": "http://www.w3.org/2001/XMLSchema", "xsi": "http://www.w3.org/2001/XMLSchema-instance", "seres": "http://seres.no/xsd/forvaltningsdata" }, "@xsdSchemaAttributes": { "AttributeFormDefault": "Unqualified", "ElementFormDefault": "Qualified", "BlockDefault": "None", "FinalDefault": "None" }, "@xsdRootElement": "test4" }, "restrictions": [], "implicitType": false }, { "objectKind": "field", "fieldType": "object", "pointer": "#/properties/foo", "isRequired": false, "isNillable": false, "isCombinationItem": false, "isArray": true, "children": ["#/properties/foo/properties/bar"], "custom": {}, "restrictions": [], "implicitType": false, "enum": [] }, { "objectKind": "field", "fieldType": "string", "pointer": "#/properties/foo/properties/bar", "isRequired": false, "isNillable": false, "isCombinationItem": false, "isArray": false, "children": [], "custom": {}, "restrictions": [], "implicitType": false, "enum": [] }],
[{ "objectKind": "field", "fieldType": "object", "pointer": "#", "isRequired": false, "isNillable": false, "isCombinationItem": false, "isArray": false, "children": ["#/properties/foo"], "custom": { "$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "http://studio-repositories:3000/JamalAlAbdullah/test-app2/App/models/test4.schema.json", "info": { "rootNode": "" }, "@xsdNamespaces": { "xsd": "http://www.w3.org/2001/XMLSchema", "xsi": "http://www.w3.org/2001/XMLSchema-instance", "seres": "http://seres.no/xsd/forvaltningsdata" }, "@xsdSchemaAttributes": { "AttributeFormDefault": "Unqualified", "ElementFormDefault": "Qualified", "BlockDefault": "None", "FinalDefault": "None" }, "@xsdRootElement": "test4" }, "restrictions": [], "implicitType": false }, { "objectKind": "field", "fieldType": "object", "pointer": "#/properties/foo", "isRequired": false, "isNillable": false, "isCombinationItem": false, "isArray": true, "children": ["#/properties/foo/items/properties/bar"], "custom": {}, "restrictions": [], "implicitType": false, "enum": [] }, { "objectKind": "field", "fieldType": "string", "pointer": "#/properties/foo/items/properties/bar", "isRequired": false, "isNillable": false, "isCombinationItem": false, "isArray": false, "children": [], "custom": {}, "restrictions": [], "implicitType": false, "enum": [] }]];


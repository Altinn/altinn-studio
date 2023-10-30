import fs from 'node:fs';

import { getHierarchyDataSourcesMock } from 'src/__mocks__/hierarchyMock';
import { dotNotationToPointer } from 'src/features/datamodel/notations';
import { lookupBindingInSchema } from 'src/features/datamodel/SimpleSchemaTraversal';
import { generateSimpleRepeatingGroups } from 'src/features/layout/repGroups/generateSimpleRepeatingGroups';
import { getLayoutComponentObject } from 'src/layout';
import { ensureAppsDirIsSet, getAllLayoutSetsWithDataModelSchema, parseJsonTolerantly } from 'src/test/allApps';
import { generateEntireHierarchy } from 'src/utils/layout/HierarchyGenerator';
import { getRootElementPath } from 'src/utils/schemaUtils';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';

describe('Data model lookups in real apps', () => {
  const dir = ensureAppsDirIsSet();
  if (!dir) {
    return;
  }

  const all = getAllLayoutSetsWithDataModelSchema(dir);
  const { out: allLayoutSets, notFound } = all;
  it.each(allLayoutSets)('$appName/$setName', ({ layouts, modelPath, dataTypeDef }) => {
    const firstKey = Object.keys(layouts)[0];
    const repeatingGroups = generateSimpleRepeatingGroups(layouts);
    const nodes = generateEntireHierarchy(
      layouts,
      firstKey,
      repeatingGroups,
      getHierarchyDataSourcesMock(),
      getLayoutComponentObject,
    );

    const schema = parseJsonTolerantly(fs.readFileSync(modelPath, 'utf-8'));
    const rootPath = getRootElementPath(schema, dataTypeDef);
    const failures: any[] = [];

    for (const [pageKey, layout] of Object.entries(nodes.all())) {
      for (const node of layout.flat(true)) {
        const ctx: LayoutValidationCtx<any> = {
          node,
          lookupBinding(binding: string) {
            const schemaPath = dotNotationToPointer(binding);
            return lookupBindingInSchema({
              schema,
              targetPointer: schemaPath,
              rootElementPath: rootPath,
            });
          },
        };

        if ('validateDataModelBindings' in node.def) {
          const errors = node.def.validateDataModelBindings(ctx);
          if (errors.length) {
            failures.push({
              pageKey,
              component: node.item.baseComponentId || node.item.id,
              errors,
            });
          }
        }
      }
    }

    expect(JSON.stringify(failures, null, 2)).toEqual('[]');
  });

  it('expected to find data model schema for all apps/sets (do not expect this to pass, broken apps exist)', () => {
    expect(notFound).toEqual([]);
  });
});

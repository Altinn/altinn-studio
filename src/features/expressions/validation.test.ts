import { getHierarchyDataSourcesMock } from 'src/__mocks__/hierarchyMock';
import { evalExprInObj, ExprConfigForComponent, ExprConfigForGroup } from 'src/features/expressions/index';
import { convertLayouts, getSharedTests } from 'src/features/expressions/shared';
import { asExpression, preProcessLayout } from 'src/features/expressions/validation';
import { getLayoutComponentObject } from 'src/layout';
import { groupIsRepeatingExt } from 'src/layout/Group/tools';
import { generateEntireHierarchy } from 'src/utils/layout/HierarchyGenerator';
import type { Layouts } from 'src/features/expressions/shared';
import type { ILayout } from 'src/layout/layout';
import type { IRepeatingGroups } from 'src/types';

function generateRepeatingGroups(layout: ILayout) {
  const repeatingGroups: IRepeatingGroups = {};
  for (const component of layout) {
    if (component.type === 'Group' && groupIsRepeatingExt(component)) {
      repeatingGroups[component.id] = {
        index: 1,
        editIndex: -1,
      };
      for (const child of component.children) {
        const childElm = layout.find((c) => c.id === child);
        if (childElm?.type === 'Group' && groupIsRepeatingExt(childElm)) {
          repeatingGroups[`${childElm.id}-0`] = {
            index: 1,
            editIndex: -1,
          };
        }
      }
    }
  }

  return repeatingGroups;
}

function evalAllExpressions(layouts: Layouts) {
  let repeatingGroups: IRepeatingGroups = {};
  for (const page of Object.values(layouts)) {
    repeatingGroups = {
      ...repeatingGroups,
      ...generateRepeatingGroups(page.data.layout),
    };
  }
  const dataSources = getHierarchyDataSourcesMock();
  const nodes = generateEntireHierarchy(
    convertLayouts(layouts),
    Object.keys(layouts)[0],
    repeatingGroups,
    dataSources,
    getLayoutComponentObject,
  );
  for (const page of Object.values(nodes.all())) {
    for (const node of page.flat(true)) {
      const input = { ...node.item };
      delete input['children'];
      delete input['rows'];
      delete input['childComponents'];

      evalExprInObj({
        input,
        node,
        config: {
          ...ExprConfigForComponent,
          ...ExprConfigForGroup,
        },
        dataSources,
      });
    }
  }
}

describe('Expression validation', () => {
  let originalLogError: typeof window.logError;

  beforeEach(() => {
    originalLogError = window.logError;
    window.logError = jest.fn();
  });

  afterEach(() => {
    window.logError = originalLogError;
  });

  describe('Shared tests for invalid expressions', () => {
    const invalidSharedTests = getSharedTests('invalid');
    it.each(invalidSharedTests.content)('$name', (invalid) => {
      expect(() => asExpression(invalid.expression)).toThrow(invalid.expectsFailure);
    });
  });

  describe('Shared tests for layout preprocessor', () => {
    const tests = getSharedTests('layout-preprocessor');
    it.each(tests.content)('$name', (t) => {
      const warningsExpected = t.expectsWarnings || [];
      const logSpy = jest.spyOn(console, 'log');
      if (warningsExpected.length > 0) {
        logSpy.mockImplementation(() => undefined);
      }

      const result: (typeof tests)['content'][number]['layouts'] = {};
      for (const page of Object.keys(t.layouts)) {
        const layout = t.layouts[page].data.layout;
        preProcessLayout(layout);
        result[page] = {
          $schema: t.layouts[page].$schema,
          data: { layout },
        };
      }

      expect(result).toEqual(t.expects);

      // Runs all the expressions inside the layout. This is done so that we have shared tests that make sure to
      // check that evaluating expressions in a component/node context works (i.e. that "triggers": ["validation"]
      // is not interpreted as an expression). This will throw errors if anything goes wrong, which should make the
      // test fail.
      evalAllExpressions(result);

      const warningsFound: string[] = [];
      for (const call of logSpy.mock.calls) {
        for (const warning of warningsExpected) {
          if ((call[0] as string).includes(`%c${warning}%c`)) {
            warningsFound.push(warning);
          }
        }
      }
      expect(warningsFound.sort()).toEqual(warningsExpected.sort());

      logSpy.mockRestore();
    });
  });

  describe('Some values/objects should not validate', () => {
    it.each([
      '',
      null,
      false,
      undefined,
      5,
      new Date(),
      {},
      { hello: 'world' },
      { expr: 'hello world' },
      { expr: '5 == 5', and: 'other property' },
    ])('should validate %p as an invalid expression (non-throwing)', (maybeExpr) => {
      expect(asExpression(maybeExpr)).toBeUndefined();
    });
  });
});

import { ExprFunctions } from 'src/features/expressions/expression-functions';
import { getSharedTests } from 'src/features/expressions/shared';
import { implementsDisplayData } from 'src/layout';
import { getComponentConfigs } from 'src/layout/components.generated';

describe('Shared function tests should exist', () => {
  const sharedTests = getSharedTests('functions');

  describe('DisplayValue tests', () => {
    for (const [type, config] of Object.entries(getComponentConfigs())) {
      if (implementsDisplayData(config.def)) {
        it(`Component '${type}' should hava a matching test in functions/displayValue/type-${type}.json`, () => {
          expect(
            sharedTests?.content
              .find(({ folderName }) => folderName === 'displayValue')
              ?.content.find(({ expression, layouts, name }) => {
                const isCorrectFunction = expression?.[0] === 'displayValue';
                const targetComponent =
                  isCorrectFunction &&
                  Object.values(layouts ?? {}).find((layout) =>
                    layout.data.layout.find((component) => component.id === expression?.[1] && component.type === type),
                  );

                // Name ends with ` (filename.json)`
                const fileName = name.match(/.*\((.*)\)$/)?.[1];
                const isCorrectFileName = fileName === `type-${type}.json`;

                return isCorrectFunction && !!targetComponent && isCorrectFileName;
              }),
          ).toBeTruthy();
        });
      }
    }
  });

  describe('Function tests', () => {
    for (const exprFunc of Object.keys(ExprFunctions)) {
      it(`Expression function ${exprFunc} should have a test folder`, () => {
        expect(sharedTests?.content.find(({ folderName }) => folderName === exprFunc)).toBeTruthy();
      });
    }
  });
});

import { implementsDisplayData } from '.';

import { getSharedTests } from 'src/features/expressions/shared';
import { ComponentConfigs } from 'src/layout/components';

describe('Layout', () => {
  describe('Every component impementing DisplayData should have at least one shared test of displayValue expression', () => {
    const sharedTests = getSharedTests('functions').content.find(({ folderName }) => folderName === 'displayValue');
    for (const [type, config] of Object.entries(ComponentConfigs)) {
      if (implementsDisplayData(config.def)) {
        it(`Component: ${type}`, () => {
          expect(
            sharedTests?.content.find(
              ({ expression, layouts }) =>
                expression.at(0) === 'displayValue' &&
                Object.values(layouts ?? {}).find((layout) =>
                  layout.data.layout.find((component) => component.id === expression.at(1) && component.type === type),
                ),
            ),
          ).toBeTruthy();
        });
      }
    }
  });
});

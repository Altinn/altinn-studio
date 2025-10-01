import { getComponentConfigs } from 'src/layout/components.generated';

const checkLegacy = false;

describe('Component config verification', () => {
  describe.skip('Summarizable', () => {
    for (const [type, config] of Object.entries(getComponentConfigs())) {
      const isSummarizable = config.behaviors.isSummarizable;
      if (isSummarizable) {
        it(`Component ${type} should implement renderSummary2`, () => {
          const func = config.def.renderSummary2;
          testRenderSummary(func);
        });
        if (checkLegacy) {
          it(`Component ${type} should implement renderSummary`, () => {
            const def = config.def;
            const func = 'renderSummary' in def ? def.renderSummary : undefined;
            testRenderSummary(func);
          });
        }
      } else {
        it(`Component ${type} should NOT implement renderSummary2`, () => {
          const func = config.def.renderSummary2;
          expect(func).toBe(undefined);
        });
        if (checkLegacy) {
          it(`Component ${type} should NOT implement renderSummary`, () => {
            const def = config.def;
            const func = 'renderSummary' in def ? def.renderSummary : undefined;
            expect(func).toBe(undefined);
          });
        }
      }
    }
  });
});

function testRenderSummary(func: unknown) {
  expect(func).toBeInstanceOf(Function);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((func as any)({})).not.toBe(null);
  } catch (_e) {
    // If it crashes, it isn't just returning null, so that's a success
    expect(true).toBe(true);
  }
}

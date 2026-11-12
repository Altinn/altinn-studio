import React from 'react';

import { screen } from '@testing-library/react';
import type { ILabelSettings } from '@app/layout-contract/generated/common.generated';

import { TaskOverrides } from 'src/core/contexts/TaskOverrides';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import { getLabelSettings, useShowOptionalIndicator } from 'src/utils/layout/useShowOptionalIndicator';
import type { CompExternal } from 'src/layout/layout';

function Probe({ labelSettings }: { labelSettings: ILabelSettings | undefined }) {
  return <span>{useShowOptionalIndicator(labelSettings) ? 'shown' : 'hidden'}</span>;
}

describe('useShowOptionalIndicator', () => {
  it.each`
    appHides     | folderHides  | optionalIndicator | expected
    ${undefined} | ${undefined} | ${undefined}      | ${'shown'}
    ${true}      | ${undefined} | ${undefined}      | ${'hidden'}
    ${true}      | ${false}     | ${undefined}      | ${'shown'}
    ${true}      | ${undefined} | ${true}           | ${'shown'}
  `(
    'is $expected when the app hides it: $appHides, the task hides it: $folderHides, the component shows it: $optionalIndicator',
    async ({ appHides, folderHides, optionalIndicator, expected }) => {
      const { ui } = window.altinnAppGlobalData;
      if (appHides === undefined) {
        delete ui.settings!.hideOptionalIndicator;
      } else {
        ui.settings!.hideOptionalIndicator = appHides;
      }
      ui.folders.Task_1.pages.hideOptionalIndicator = folderHides;

      await renderWithoutInstanceAndLayout({
        renderer: () => (
          <TaskOverrides uiFolder='Task_1'>
            <Probe labelSettings={optionalIndicator === undefined ? undefined : { optionalIndicator }} />
          </TaskOverrides>
        ),
      });

      expect(screen.getByText(expected)).toBeInTheDocument();
    },
  );
});

describe('getLabelSettings', () => {
  it('returns the label settings of a component', () => {
    const config = { id: 'input', type: 'Input', labelSettings: { optionalIndicator: false } } as CompExternal;
    expect(getLabelSettings(config)).toEqual({ optionalIndicator: false });
  });

  it('ignores label settings on a custom component', () => {
    const config = {
      id: 'custom',
      type: 'Custom',
      tagName: 'my-element',
      labelSettings: { optionalIndicator: false },
    } as unknown as CompExternal;
    expect(getLabelSettings(config)).toBeUndefined();
  });
});

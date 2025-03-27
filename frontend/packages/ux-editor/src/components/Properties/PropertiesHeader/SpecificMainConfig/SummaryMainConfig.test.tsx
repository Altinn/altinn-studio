import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../testing/mocks';
import { SummaryMainConfig } from './SummaryMainConfig';
import type { FormItem } from '../../../../types/FormItem';
import { ComponentType } from 'app-shared/types/ComponentType';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import {
  layoutSet1NameMock,
  layoutSet2NameMock,
  layoutSetsExtendedMock,
  layoutSetsMock,
} from '../../../../testing/layoutSetsMock';
import { layout1NameMock, layoutMock } from '../../../../testing/layoutMock';

const summary2Component: FormItem = {
  id: '0',
  type: ComponentType.Summary2,
  itemType: 'COMPONENT',
  target: {},
};

describe('ComponentMainConfig', () => {
  describe('Summary2', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render summary2 config', async () => {
      const user = userEvent.setup();
      render(summary2Component);
      expect(summary2AccordionButton()).toBeInTheDocument();
      await user.click(summary2AccordionButton());
      expect(summary2AddOverrideButton()).toBeInTheDocument();
    });

    it('should display overrides', async () => {
      const user = userEvent.setup();
      const summary2ComponentWithOverrides = {
        ...summary2Component,
        overrides: [{ componentId: '0' }],
      };
      render(summary2ComponentWithOverrides);
      await user.click(summary2AccordionButton());
      expect(summary2CollapsedButton(1)).toBeInTheDocument();
    });

    it('should call handleComponentChange when adding overrides', async () => {
      const user = userEvent.setup();
      render(summary2Component);
      await user.click(summary2AccordionButton());
      await user.click(summary2AddOverrideButton());
      expect(handleComponentChange).toHaveBeenCalledTimes(1);
    });

    it('should call handleComponentChange when changing target', async () => {
      const user = userEvent.setup();
      render(summary2Component);
      await user.selectOptions(summary2TargetLayoutSet(), layoutSet2NameMock);
      expect(handleComponentChange).toHaveBeenCalledTimes(1);
    });
  });
});

const summary2AccordionButton = () =>
  screen.getByRole('button', { name: /ux_editor.component_properties.summary.override.title/ });
const summary2AddOverrideButton = () =>
  screen.getByRole('button', { name: /ux_editor.component_properties.summary.add_override/ });
const summary2CollapsedButton = (n: number) =>
  screen.getByRole('button', {
    name: new RegExp(`ux_editor.component_properties.summary.overrides.nth.*:${n}}`),
  });

const summary2TargetLayoutSet = () =>
  screen.getByRole('combobox', { name: /ux_editor.component_properties.target_layoutSet_id/ });

const handleComponentChange = jest.fn();
const render = (component: FormItem<ComponentType.Summary2>) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSet1NameMock], {
    [layout1NameMock]: layoutMock,
  });
  queryClient.setQueryData([QueryKey.LayoutSets, org, app], layoutSetsMock);
  queryClient.setQueryData([QueryKey.LayoutSetsExtended, org, app], layoutSetsExtendedMock);
  renderWithProviders(
    <SummaryMainConfig component={component} handleComponentChange={handleComponentChange} />,
    {
      queryClient,
      appContextProps: {
        selectedFormLayoutSetName: layoutSet1NameMock,
        selectedFormLayoutName: layout1NameMock,
      },
    },
  );
};

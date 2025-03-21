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
import { layoutSet2NameMock, layoutSetsExtendedMock } from '../../../../testing/layoutSetsMock';
import { textMock } from '@studio/testing/mocks/i18nMock';

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
      render(summary2Component);
      expect(
        screen.getByText(textMock('ux_editor.component_properties.target')),
      ).toBeInTheDocument();
    });

    it('should call handleComponentChange when changing target', async () => {
      const user = userEvent.setup();
      render(summary2Component);
      await user.selectOptions(summary2TargetLayoutSet(), layoutSet2NameMock);
      expect(handleComponentChange).toHaveBeenCalledTimes(1);
    });
  });
});

const summary2TargetLayoutSet = () =>
  screen.getByRole('combobox', { name: /ux_editor.component_properties.target_layoutSet_id/ });

const handleComponentChange = jest.fn();
const render = (component: FormItem<ComponentType.Summary2>) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSetsExtended, org, app], layoutSetsExtendedMock);

  renderWithProviders(
    <SummaryMainConfig component={component} handleComponentChange={handleComponentChange} />,
    { queryClient },
  );
};

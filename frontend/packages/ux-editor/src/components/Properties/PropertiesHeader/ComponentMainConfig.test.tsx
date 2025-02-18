import React from 'react';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import { ComponentType } from 'app-shared/types/ComponentType';
import { screen } from '@testing-library/react';
import { ComponentMainConfig } from './ComponentMainConfig';
import { component1Mock } from '@altinn/ux-editor/testing/layoutMock';
import { addFeatureFlagToLocalStorage, FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { typedLocalStorage } from '@studio/pure-functions';
import { renderWithProviders } from '../../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { layoutSetsExtendedMock } from '@altinn/ux-editor/testing/layoutSetsMock';

const summary2ComponentMock: FormItem = {
  id: '0',
  type: ComponentType.Summary2,
  itemType: 'COMPONENT',
  target: {},
};

describe('ComponentMainConfig', () => {
  afterEach(() => {
    jest.clearAllMocks();
    typedLocalStorage.removeItem('featureFlags');
  });

  it('should render summary2 config when the component type matches', async () => {
    renderComponentMainConfig(summary2ComponentMock);

    const targetHeader = screen.getByText(textMock('ux_editor.component_properties.target'));
    expect(targetHeader).toBeInTheDocument();
  });

  it('should render header config when feature flag is set, but the type does not match', async () => {
    addFeatureFlagToLocalStorage(FeatureFlag.MainConfig);
    renderComponentMainConfig(component1Mock);

    const sectionHeader = textMock('ux_editor.component_properties.main_configuration');
    const headerMainConfig = screen.getByText(sectionHeader);
    expect(headerMainConfig).toBeInTheDocument();
  });
});

const renderComponentMainConfig = (component: FormItem) => {
  const handleComponentChange = jest.fn();
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSetsExtended, org, app], layoutSetsExtendedMock);
  return renderWithProviders(
    <ComponentMainConfig component={component} handleComponentChange={handleComponentChange} />,
    { queryClient },
  );
};

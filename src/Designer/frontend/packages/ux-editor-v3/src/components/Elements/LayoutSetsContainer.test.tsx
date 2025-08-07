import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayoutSetsContainer } from './LayoutSetsContainer';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithMockStore } from '../../testing/mocks';
import {
  layoutSet1NameMock,
  layoutSet2NameMock,
  layoutSetsMock,
} from '@altinn/ux-editor-v3/testing/layoutSetsMock';
import type { AppContextProps } from '../../AppContext';
import { appStateMock } from '../../testing/stateMocks';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));
// Test data
const layoutSetName1 = layoutSet1NameMock;
const layoutSetName2 = layoutSet2NameMock;
const { selectedLayoutSet } = appStateMock.formDesigner.layout;
const setSelectedLayoutSetMock = jest.fn();

describe('LayoutSetsContainer', () => {
  it('renders component', async () => {
    render();

    expect(await screen.findByRole('option', { name: layoutSetName1 })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: layoutSetName2 })).toBeInTheDocument();
  });

  it('NativeSelect should be rendered', async () => {
    render();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('Should update selected layout set when set is clicked in native select', async () => {
    render();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole('combobox'), layoutSetName2);
    expect(setSelectedLayoutSetMock).toHaveBeenCalledTimes(1);
  });
});

const render = () => {
  queryClientMock.setQueryData([QueryKey.LayoutSets, org, app], layoutSetsMock);
  const appContextProps: Partial<AppContextProps> = {
    selectedLayoutSet: selectedLayoutSet,
    setSelectedLayoutSet: setSelectedLayoutSetMock,
  };
  return renderWithMockStore({}, {}, undefined, appContextProps)(<LayoutSetsContainer />);
};

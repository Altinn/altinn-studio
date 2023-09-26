import React from 'react';
import { screen, act } from '@testing-library/react';
import { LayoutSetsContainer } from './LayoutSetsContainer';
import userEvent from '@testing-library/user-event';
import { renderWithMockStore } from '../../testing/mocks';
import { layoutSetsMock } from '../../testing/layoutMock';
import { useDispatch } from 'react-redux';

const user = userEvent.setup();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

describe('LayoutSetsContainer', () => {
  it('renders component', async () => {
    render();

    expect(
      await screen.findByRole('button', { name: layoutSetsMock.sets[0].id })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: layoutSetsMock.sets[1].id })
    ).toBeInTheDocument();
  });

  it('updates selected layout when clicking on layout button', async () => {
    const mockDispatch = jest.fn();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

    render();

    const button = await screen.findByRole('button', { name: layoutSetsMock.sets[0].id });
    await act(() => user.click(button));

    expect(mockDispatch).toBeCalledWith({
      payload: layoutSetsMock.sets[0].id,
      type: 'formDesigner/updateSelectedLayoutSet',
    });
  });
});

const render = () => renderWithMockStore()(<LayoutSetsContainer />);

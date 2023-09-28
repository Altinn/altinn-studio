import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { LayoutSetsContainer } from './LayoutSetsContainer';
import userEvent from '@testing-library/user-event';
import { renderWithMockStore } from '../../testing/mocks';
import { layoutSetsMock } from '../../testing/layoutMock';
import { useDispatch } from 'react-redux';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

describe('LayoutSetsContainer', () => {
  it('renders component', async () => {
    render();

    expect(
      await screen.findByRole('option', { name: layoutSetsMock.sets[0].id }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('option', { name: layoutSetsMock.sets[1].id }),
    ).toBeInTheDocument();
  });

  it('NativeSelect should be rendered', async () => {
    render();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('calls dispatch when selecting an option', async () => {
    const dispatch = jest.fn();
    (useDispatch as jest.Mock).mockReturnValue(dispatch);
    render();

    await waitFor(async () => {
      await userEvent.selectOptions(
        screen.getByRole('combobox'),
        screen.getByRole('option', { name: layoutSetsMock.sets[0].id }),
      );
    });

    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('handles onChange event', async () => {
    render();

    await waitFor(async () => {
      await userEvent.selectOptions(
        screen.getByRole('combobox'),
        screen.getByRole('option', { name: layoutSetsMock.sets[0].id }),
      );
    });

    expect(
      await screen.findByRole('option', { name: layoutSetsMock.sets[0].id }),
    ).toBeInTheDocument();
  });
});

const render = () => renderWithMockStore()(<LayoutSetsContainer />);

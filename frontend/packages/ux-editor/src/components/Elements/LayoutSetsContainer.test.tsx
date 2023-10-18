import React from 'react';
import { screen } from '@testing-library/react';
import { LayoutSetsContainer } from './LayoutSetsContainer';
import { renderWithMockStore } from '../../testing/mocks';
import { layoutSetsMock } from '../../testing/layoutMock';

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
  
});

const render = () => renderWithMockStore()(<LayoutSetsContainer />);

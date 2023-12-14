import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditGrid } from './EditGrid';
import { renderWithMockStore, renderHookWithMockStore } from '../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';
import { ComponentType } from 'app-shared/types/ComponentType';
import { textMock } from '../../../../../../testing/mocks/i18nMock';

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async ({
  grid = undefined,
  type = undefined,
  handleComponentChange = jest.fn(),
} = {}) => {
  await waitForData();

  return renderWithMockStore()(
    <EditGrid
      handleComponentChange={handleComponentChange}
      component={{
        id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
        type,
        textResourceBindings: {
          title: 'SomeTextId',
        },
        grid,
        itemType: 'COMPONENT',
        dataModelBindings: {},
      }}
    />,
  );
};

describe('EditGrid', () => {
  it('should show grid value 4 on slider for mobile tab when xs: "4" is set on grid on component', async () => {
    await render({ grid: { xs: '4' }, type: ComponentType.Input });

    const mobileTab = screen.getByRole('tab', {
      name: textMock('ux_editor.modal_properties_grid_size_xs'),
    });
    expect(mobileTab).toBeInTheDocument();

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveValue('4');

    const selectedSliderValue = screen.getByText('4');
    expect(selectedSliderValue).toBeInTheDocument();
  });

  it('should show that default value, 12, is set for grid on both xs and md when not set on component', async () => {
    const user = userEvent.setup();
    await render({ type: ComponentType.Input });

    const lockIconLaptop = screen.getByRole('img', { name: 'lockIcon' });
    expect(lockIconLaptop).toBeInTheDocument();

    const sliderLaptop = screen.getByRole('slider');
    expect(sliderLaptop).toBeInTheDocument();
    expect(sliderLaptop).toHaveValue('12');
    expect(sliderLaptop).toHaveAttribute('disabled');

    const mobileTab = screen.getByRole('tab', {
      name: textMock('ux_editor.modal_properties_grid_size_xs'),
    });
    expect(mobileTab).toBeInTheDocument();
    await act(() => user.click(mobileTab));

    const lockIconMobile = screen.getByRole('img', { name: 'lockIcon' });
    expect(lockIconMobile).toBeInTheDocument();

    const sliderMobile = screen.getByRole('slider');
    expect(sliderMobile).toBeInTheDocument();
    expect(sliderMobile).toHaveValue('12');
    expect(sliderMobile).toHaveAttribute('disabled');
  });

  it('should show slider value equals to grid xs: "2" when switching tab from laptop with grid md: "6"', async () => {
    const user = userEvent.setup();
    await render({ grid: { xs: '2', md: '6' }, type: ComponentType.Input });

    const mobileTab = screen.getByRole('tab', {
      name: textMock('ux_editor.modal_properties_grid_size_xs'),
    });
    expect(mobileTab).toBeInTheDocument();

    const sliderLaptop = screen.getByRole('slider');
    expect(sliderLaptop).toHaveValue('6');

    await act(() => user.click(mobileTab));

    const sliderMobile = screen.getByRole('slider');
    expect(sliderMobile).toHaveValue('2');
  });

  it('should show laptop tab as selected when grid is not set on any screens on component', async () => {
    await render({ type: ComponentType.Input });

    const laptopTab = screen.getByRole('tab', {
      name: textMock('ux_editor.modal_properties_grid_size_md'),
    });
    expect(laptopTab).toBeInTheDocument();
    expect(laptopTab).toHaveAttribute('aria-selected', 'true');

    const mobileTab = screen.getByRole('tab', {
      name: textMock('ux_editor.modal_properties_grid_size_xs'),
    });
    expect(mobileTab).toBeInTheDocument();
    expect(mobileTab).toHaveAttribute('aria-selected', 'false');
  });

  it('should show mobile tab as selected when grid is only set on xs on component', async () => {
    await render({ grid: { xs: '3' }, type: ComponentType.Input });

    const laptopTab = screen.getByRole('tab', {
      name: textMock('ux_editor.modal_properties_grid_size_md'),
    });
    expect(laptopTab).toBeInTheDocument();
    expect(laptopTab).toHaveAttribute('aria-selected', 'false');

    const mobileTab = screen.getByRole('tab', {
      name: textMock('ux_editor.modal_properties_grid_size_xs'),
    });
    expect(mobileTab).toBeInTheDocument();
    expect(mobileTab).toHaveAttribute('aria-selected', 'true');
  });

  it('should show laptop tab as selected when grid is set on both xs and md on component', async () => {
    await render({ grid: { xs: '3', md: '6' }, type: ComponentType.Input });

    const laptopTab = screen.getByRole('tab', {
      name: textMock('ux_editor.modal_properties_grid_size_md'),
    });
    expect(laptopTab).toBeInTheDocument();
    expect(laptopTab).toHaveAttribute('aria-selected', 'true');

    const mobileTab = screen.getByRole('tab', {
      name: textMock('ux_editor.modal_properties_grid_size_xs'),
    });
    expect(mobileTab).toBeInTheDocument();
    expect(mobileTab).toHaveAttribute('aria-selected', 'false');
  });
});

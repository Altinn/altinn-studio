import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithMockStore, renderHookWithMockStore } from '../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';
import { EditGridForGivenViewSize } from './EditGridForGivenViewSize';
import { GridSizeForViewSize, ViewSizeForGridProp } from './EditGrid';
import { textMock } from '../../../../../../testing/mocks/i18nMock';

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async ({
  gridValues = { xs: 3, md: 10 } as GridSizeForViewSize,
  viewSize = ViewSizeForGridProp.M,
  handleUpdateGrid = jest.fn(),
} = {}) => {
  await waitForData();

  return renderWithMockStore()(
    <EditGridForGivenViewSize
      handleUpdateGrid={handleUpdateGrid}
      viewSize={viewSize}
      gridValues={gridValues}
    />,
  );
};

describe('EditGridForGivenViewSize', () => {
  it('should show that default value, 12, is set for grid when gridValue is not set for laptop viewSize', async () => {
    await render({ gridValues: { xs: 3 } });

    const lockIcon = screen.getByRole('img', { name: 'lockIcon' });
    expect(lockIcon).toBeInTheDocument();

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveValue('12');
    expect(slider).toHaveAttribute('disabled');

    const switchLaptop = screen.getByRole('checkbox', {
      name: textMock('ux_editor.modal_properties_grid_use_default'),
    });
    expect(switchLaptop).toBeInTheDocument();
    expect(switchLaptop).toHaveAttribute('checked');
  });

  it('should show that default value, 12, is set for grid when gridValue is not set for mobile viewSize', async () => {
    await render({ gridValues: { md: 3 }, viewSize: ViewSizeForGridProp.S });

    const lockIconMobile = screen.getByRole('img', { name: 'lockIcon' });
    expect(lockIconMobile).toBeInTheDocument();

    const sliderMobile = screen.getByRole('slider');
    expect(sliderMobile).toBeInTheDocument();
    expect(sliderMobile).toHaveValue('12');
    expect(sliderMobile).toHaveAttribute('disabled');

    const switchLaptop = screen.getByRole('checkbox', {
      name: textMock('ux_editor.modal_properties_grid_use_default'),
    });
    expect(switchLaptop).toBeInTheDocument();
    expect(switchLaptop).toHaveAttribute('checked');
  });

  it('should call handleUpdateGrid with updated value for laptop viewSize when slider is clicked', async () => {
    const handleUpdateGridMock = jest.fn();
    await render({ handleUpdateGrid: handleUpdateGridMock });

    const sliderMobile = screen.getByRole('slider');
    expect(sliderMobile).toBeInTheDocument();
    expect(sliderMobile).toHaveValue('10');

    fireEvent.change(sliderMobile, { target: { value: '3' } });

    expect(handleUpdateGridMock).toHaveBeenCalledWith({
      md: 3,
      xs: 3,
    });
  });
});

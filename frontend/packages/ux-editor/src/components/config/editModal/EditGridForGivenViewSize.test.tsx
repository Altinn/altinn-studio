import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithMockStore, renderHookWithMockStore } from '../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';
import { ComponentType } from 'app-shared/types/ComponentType';
import { EditGridForGivenViewSize } from './EditGridForGivenViewSize';
import { ViewSizeForGridProp } from './EditGrid';

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async ({
  viewSize = ViewSizeForGridProp.M,
  useDefaultGridSize = true,
  grid = undefined,
  type = undefined,
  handleComponentChange = jest.fn(),
} = {}) => {
  await waitForData();

  return renderWithMockStore()(
    <EditGridForGivenViewSize
      viewSize={viewSize}
      useDefaultGridSize={useDefaultGridSize}
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

describe('EditGridForGivenViewSize', () => {
  it('should show that default value, 12, is set for grid when useDefaultGrid is true', async () => {
    await render({ type: ComponentType.Input });

    const lockIcon = screen.getByRole('img', { name: 'lockIcon' });
    expect(lockIcon).toBeInTheDocument();

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveValue('12');
    expect(slider).toHaveAttribute('disabled');
  });

  it('should call handleComponentChange with grid: md: 12 when switch is disabled', async () => {
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    await render({ handleComponentChange, type: ComponentType.Input });

    const lockIcon = screen.getByRole('img', { name: 'lockIcon' });
    expect(lockIcon).toBeInTheDocument();

    const switchUseDefault = screen.getByRole('checkbox');

    await act(() => user.click(switchUseDefault));

    const lockIconAfterSwitchClick = screen.queryByRole('img', { name: 'lockIcon' });
    expect(lockIconAfterSwitchClick).not.toBeInTheDocument();

    expect(handleComponentChange).toHaveBeenCalledWith({
      id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
      itemType: 'COMPONENT',
      type: ComponentType.Input,
      textResourceBindings: {
        title: 'SomeTextId',
      },
      grid: {
        md: '12',
      },
      dataModelBindings: {},
    });
  });

  it('should call handleComponentChange with grid: md: 3 when slider is changed', async () => {
    const handleComponentChange = jest.fn();
    await render({ useDefaultGridSize: false, handleComponentChange, type: ComponentType.Input });

    const slider = screen.getByRole('slider');

    fireEvent.change(slider, { target: { value: '3' } });

    expect(handleComponentChange).toHaveBeenCalledWith({
      id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
      itemType: 'COMPONENT',
      type: ComponentType.Input,
      textResourceBindings: {
        title: 'SomeTextId',
      },
      grid: {
        md: '3',
      },
      dataModelBindings: {},
    });
  });

  it('should call handleComponentChange with new value for md, but remain original value for xs, when slider is changed to "4" for laptop', async () => {
    const handleComponentChange = jest.fn();
    await render({
      useDefaultGridSize: false,
      grid: { xs: '3' },
      handleComponentChange,
      type: ComponentType.Input,
    });

    const slider = screen.getByRole('slider');

    fireEvent.change(slider, { target: { value: '4' } });

    expect(handleComponentChange).toHaveBeenCalledWith({
      id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
      itemType: 'COMPONENT',
      type: ComponentType.Input,
      textResourceBindings: {
        title: 'SomeTextId',
      },
      grid: {
        xs: '3',
        md: '4',
      },
      dataModelBindings: {},
    });
  });

  it('should call handleComponentChange with original value for xs and no value for md when useDefaultSwitch is enabled', async () => {
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    await render({
      useDefaultGridSize: false,
      grid: { xs: '3', md: '3' },
      handleComponentChange,
      type: ComponentType.Input,
    });

    const switchUseDefault = screen.getByRole('checkbox');

    await act(() => user.click(switchUseDefault));

    expect(handleComponentChange).toHaveBeenCalledWith({
      id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
      itemType: 'COMPONENT',
      type: ComponentType.Input,
      textResourceBindings: {
        title: 'SomeTextId',
      },
      grid: {
        xs: '3',
      },
      dataModelBindings: {},
    });
  });

  it('should call handleComponentChange with original value for md and no value for xs when useDefaultSwitch is enabled', async () => {
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    await render({
      viewSize: ViewSizeForGridProp.S,
      useDefaultGridSize: false,
      grid: { xs: '3', md: '3' },
      handleComponentChange,
      type: ComponentType.Input,
    });

    const switchUseDefault = screen.getByRole('checkbox');

    await act(() => user.click(switchUseDefault));

    expect(handleComponentChange).toHaveBeenCalledWith({
      id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
      itemType: 'COMPONENT',
      type: ComponentType.Input,
      textResourceBindings: {
        title: 'SomeTextId',
      },
      grid: {
        md: '3',
      },
      dataModelBindings: {},
    });
  });

  it('should call handleComponentChange with no grid-property when useDefaultSwitch is disabled', async () => {
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    await render({
      useDefaultGridSize: false,
      grid: { md: '3' },
      handleComponentChange,
      type: ComponentType.Input,
    });

    const switchUseDefault = screen.getByRole('checkbox');

    await act(() => user.click(switchUseDefault));

    expect(handleComponentChange).toHaveBeenCalledWith({
      id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
      itemType: 'COMPONENT',
      type: ComponentType.Input,
      textResourceBindings: {
        title: 'SomeTextId',
      },
      dataModelBindings: {},
    });
  });
});

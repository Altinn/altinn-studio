import React from 'react';
import { screen, waitFor } from '@testing-library/react';

import { EditNumberValue } from './EditNumberValue';
import { renderWithProviders, renderHookWithProviders } from '../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import userEvent from '@testing-library/user-event';
import { appContextMock } from '../../../testing/appContextMock';
import { useMutation } from '@tanstack/react-query';

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithProviders(() => useLayoutSchemaQuery()).result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async ({ maxLength = undefined, handleComponentChange = jest.fn() } = {}) => {
  await waitForData();

  return renderWithProviders(
    <EditNumberValue
      handleComponentChange={handleComponentChange}
      propertyKey='maxLength'
      component={{
        id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
        type: ComponentType.Input,
        textResourceBindings: {
          title: 'ServiceName',
        },
        maxLength,
        itemType: 'COMPONENT',
        dataModelBindings: { simpleBinding: 'some-path' },
      }}
    />,
  );
};

describe('EditNumberValue', () => {
  it('should render', async () => {
    await render();
    expect(
      screen.getByText(textMock('ux_editor.component_properties.maxLength')),
    ).toBeInTheDocument();
  });

  it('should save to backend and reload the preview when changing value, including the case of changing it to undefined/empty', async () => {
    const user = userEvent.setup();
    const handleSaveMutation = renderHookWithProviders(() =>
      useMutation({
        mutationFn: () => Promise.resolve(),
      }),
    ).result;

    const mockhHandleComponentChange = jest
      .fn()
      .mockImplementation(async (mutationArgs, mutateOptions) => {
        await handleSaveMutation.current.mutateAsync(mutationArgs, mutateOptions);
      });

    await render({ handleComponentChange: mockhHandleComponentChange });

    const input = screen.getByRole('textbox');
    await user.type(input, '12');
    // The component is updated for each keystroke, so we expect the mock to be called twice -
    // I think it should prevent this behavior with this new issue: https://github.com/Altinn/altinn-studio/issues/11989
    expect(mockhHandleComponentChange).toHaveBeenCalledTimes(2);
    expect(appContextMock.refetchLayouts).toHaveBeenCalledTimes(2);
    expect(appContextMock.refetchLayouts).toHaveBeenCalledWith('test-layout-set', true);

    mockhHandleComponentChange.mockClear();
    await user.clear(input);
    expect(mockhHandleComponentChange).toHaveBeenCalledTimes(1);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { EditNumberValue } from './EditNumberValue';
import { renderHookWithProviders, renderWithProviders } from '../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import userEvent from '@testing-library/user-event';
import { appContextMock } from '../../../testing/appContextMock';
import { useMutation } from '@tanstack/react-query';
import { componentMocks } from '../../../testing/componentMocks';
import type { FormItem } from '../../../types/FormItem';
import type { PropertyDefinition } from '@app/layout-contract';
import { getComponentDefinition } from '../../../data/componentCatalog';

const renderEditNumberValue = async ({
  enumValues = null,
  maxLength = undefined,
  handleComponentChange = vi.fn(),
  componentOverrides = {},
  definition = undefined as PropertyDefinition | undefined,
} = {}) => {
  return renderWithProviders(
    <EditNumberValue
      handleComponentChange={handleComponentChange}
      propertyKey='maxLength'
      enumValues={enumValues}
      definition={definition}
      component={{
        id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
        type: ComponentType.Input,
        textResourceBindings: {
          title: 'ServiceName',
        },
        maxLength,
        dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
        ...componentOverrides,
      }}
    />,
  );
};

describe('EditNumberValue', () => {
  it.each([
    { value: 0, message: textMock('validation_errors.min', { 0: 1 }) },
    { value: 4, message: textMock('validation_errors.max', { 0: 3 }) },
    { value: 1.5, message: textMock('validation_errors.integer') },
  ])('shows the specific numeric validation message for $value', async ({ value, message }) => {
    await renderEditNumberValue({
      maxLength: value,
      definition: { type: 'integer', required: false, minimum: 1, maximum: 3 },
    });

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByText(textMock('validation_errors.pattern'))).not.toBeInTheDocument();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should render component as input field, when not given enum prop', async () => {
    await renderEditNumberValue();

    expect(
      screen.getByRole('textbox', { name: textMock('ux_editor.component_properties.maxLength') }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('should render component as select, when given enum prop', async () => {
    await renderEditNumberValue({ enumValues: [1, 2, 3] });

    expect(
      screen.getByRole('combobox', { name: textMock('ux_editor.component_properties.maxLength') }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('should call onChange when typing in input field', async () => {
    const user = userEvent.setup();
    const mockHandleComponentChange = vi.fn((componentProperties, _) => componentProperties);
    await renderEditNumberValue({
      handleComponentChange: mockHandleComponentChange,
    });

    await user.type(screen.getByRole('textbox'), '2');

    expect(mockHandleComponentChange).toHaveReturnedWith({
      id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
      type: ComponentType.Input,
      textResourceBindings: {
        title: 'ServiceName',
      },
      maxLength: 2,
      dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
    });
  });

  it('should call onChange when choosing option from select', async () => {
    const user = userEvent.setup();
    const mockHandleComponentChange = vi.fn((componentProperties, _) => componentProperties);
    await renderEditNumberValue({
      handleComponentChange: mockHandleComponentChange,
      enumValues: [1, 2, 3],
    });

    await user.selectOptions(screen.getByRole('combobox'), '1');

    expect(mockHandleComponentChange).toHaveReturnedWith({
      id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
      type: ComponentType.Input,
      textResourceBindings: {
        title: 'ServiceName',
      },
      maxLength: 1,
      dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
    });
  });

  it('should save to backend and reload the preview when changing value, including the case of changing it to undefined/empty', async () => {
    const user = userEvent.setup();
    const handleSaveMutation = renderHookWithProviders(() =>
      useMutation({
        mutationFn: () => Promise.resolve(),
      }),
    ).result;
    const mockHandleComponentChange = vi
      .fn()
      .mockImplementation(async (mutationArgs, mutateOptions) => {
        await handleSaveMutation.current.mutateAsync(mutationArgs, mutateOptions);
      });

    await renderEditNumberValue({ handleComponentChange: mockHandleComponentChange });

    const input = screen.getByRole('textbox');
    await user.type(input, '12');
    // The component is updated for each keystroke, so we expect the mock to be called twice -
    // I think it should prevent this behavior with this new issue: https://github.com/Altinn/altinn-studio/issues/11989
    expect(mockHandleComponentChange).toHaveBeenCalledTimes(2);
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledTimes(2);
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledWith('test-layout-set', true);

    mockHandleComponentChange.mockClear();
    await user.clear(input);
    expect(mockHandleComponentChange).toHaveBeenCalledTimes(1);
  });

  it('should update the number value', async () => {
    const user = userEvent.setup();
    const mockHandleComponentChange = vi.fn((componentProperties, _) => componentProperties);
    await renderEditNumberValue({
      handleComponentChange: mockHandleComponentChange,
    });
    await user.type(screen.getByRole('textbox'), '2');
    expect(mockHandleComponentChange).toHaveReturnedWith({
      id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
      type: ComponentType.Input,
      textResourceBindings: {
        title: 'ServiceName',
      },
      maxLength: 2,
      dataModelBindings: { simpleBinding: { field: 'some-path', dataType: '' } },
    });
  });

  describe('for the number of attachments', () => {
    it.each([
      {
        propertyKey: 'minNumberOfAttachments' as const,
        value: '2',
        numberOfAttachments: { minNumberOfAttachments: 1, maxNumberOfAttachments: 1 },
        errorCode: 'minNumberOfAttachments_above_max',
      },
      {
        propertyKey: 'maxNumberOfAttachments' as const,
        value: '1',
        numberOfAttachments: { minNumberOfAttachments: 2, maxNumberOfAttachments: 2 },
        errorCode: 'maxNumberOfAttachments_below_min',
      },
    ])(
      'shows an error and does not save $propertyKey $value when it breaks the other count',
      async ({ propertyKey, value, numberOfAttachments, errorCode }) => {
        const user = userEvent.setup();
        const handleComponentChange = vi.fn();
        await renderNumberOfAttachments({
          propertyKey,
          numberOfAttachments,
          handleComponentChange,
        });

        await user.clear(screen.getByRole('textbox'));
        await user.type(screen.getByRole('textbox'), value);

        expect(
          screen.getByText(textMock(`ux_editor.component_properties.${errorCode}`)),
        ).toBeInTheDocument();
        expect(handleComponentChange).not.toHaveBeenCalledWith(
          expect.objectContaining({ [propertyKey]: Number(value) }),
          expect.anything(),
        );
      },
    );

    it.each([
      {
        propertyKey: 'minNumberOfAttachments' as const,
        value: '2',
        numberOfAttachments: { minNumberOfAttachments: 1, maxNumberOfAttachments: 2 },
      },
      {
        propertyKey: 'maxNumberOfAttachments' as const,
        value: '2',
        numberOfAttachments: { minNumberOfAttachments: 2, maxNumberOfAttachments: 3 },
      },
    ])(
      'saves $propertyKey $value when it does not break the other count',
      async ({ propertyKey, value, numberOfAttachments }) => {
        const user = userEvent.setup();
        const handleComponentChange = vi.fn();
        await renderNumberOfAttachments({
          propertyKey,
          numberOfAttachments,
          handleComponentChange,
        });

        await user.clear(screen.getByRole('textbox'));
        await user.type(screen.getByRole('textbox'), value);

        expect(handleComponentChange).toHaveBeenCalledWith(
          expect.objectContaining({ [propertyKey]: Number(value) }),
          expect.anything(),
        );
      },
    );
  });
});

type RenderNumberOfAttachmentsProps = {
  propertyKey: 'minNumberOfAttachments' | 'maxNumberOfAttachments';
  numberOfAttachments: Partial<FormItem<ComponentType.FileUpload>>;
  handleComponentChange: () => void;
};

const renderNumberOfAttachments = async ({
  propertyKey,
  numberOfAttachments,
  handleComponentChange,
}: RenderNumberOfAttachmentsProps) => {
  return renderWithProviders(
    <EditNumberValue
      handleComponentChange={handleComponentChange}
      propertyKey={propertyKey}
      definition={getComponentDefinition(ComponentType.FileUpload).properties[propertyKey]}
      component={{ ...componentMocks[ComponentType.FileUpload], ...numberOfAttachments }}
    />,
  );
};

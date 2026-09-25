import React from 'react';

import { act, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { CUSTOM_REACT_API_VERSION, registerComponent } from 'src/features/customReact/registry';
import {
  CustomReactComponent,
  CustomReactRenderer,
  REGISTRATION_TIMEOUT_MS,
} from 'src/layout/CustomReact/CustomReactComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { CustomReactComponentProps } from 'src/features/customReact/types';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const receivedProps = vi.fn<(props: CustomReactComponentProps) => void>();

function TestComponent(props: CustomReactComponentProps<{ buttonText: string }>) {
  receivedProps(props);
  return (
    <div>
      <span data-testid='value'>{String(props.formData.value)}</span>
      <span data-testid='title'>{props.texts.title}</span>
      <button onClick={() => props.setValue('value', 42)}>{props.options.buttonText}</button>
      <button onClick={() => props.setValue('unknown', 'x')}>unknown binding</button>
    </div>
  );
}

beforeAll(() => {
  registerComponent({ name: 'test-component', component: TestComponent, apiVersion: CUSTOM_REACT_API_VERSION });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CustomReactComponent', () => {
  it('passes data, texts, options and state to the registered component', async () => {
    await render();

    expect(screen.getByTestId('value')).toHaveTextContent('5');
    expect(screen.getByTestId('title')).toHaveTextContent('my.title');
    expect(receivedProps).toHaveBeenLastCalledWith({
      id: 'my-test-component-id',
      formData: { value: 5 },
      setValue: expect.any(Function),
      texts: { title: 'my.title', extraText: 'my.extra.text' },
      language: 'nb',
      readOnly: false,
      required: true,
      isValid: true,
      summaryMode: false,
      options: { buttonText: 'Set to 42' },
    });
  });

  it('renders the label from the title text resource', async () => {
    await render();
    expect(screen.getByText('my.title', { selector: '.ds-label *' })).toBeInTheDocument();
  });

  it('passes summary mode as read-only, without a label', async () => {
    await render({
      renderer: (props) => (
        <CustomReactRenderer
          baseComponentId={props.baseComponentId}
          summaryMode={true}
        />
      ),
    });

    expect(receivedProps).toHaveBeenLastCalledWith(expect.objectContaining({ summaryMode: true, readOnly: true }));
    expect(screen.queryByText('my.title', { selector: '.ds-label *' })).not.toBeInTheDocument();
  });

  it('writes values to the data model binding', async () => {
    const { formDataMethods } = await render();

    await userEvent.click(screen.getByRole('button', { name: 'Set to 42' }));

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'myValue', dataType: defaultDataTypeMock },
      newValue: 42,
    });
  });

  it('ignores values for bindings that are not configured, and logs an error', async () => {
    const logError = vi.spyOn(window, 'logError').mockImplementation(() => {});
    const { formDataMethods } = await render();

    await userEvent.click(screen.getByRole('button', { name: 'unknown binding' }));

    expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(expect.stringContaining(`data model binding 'unknown'`));
  });

  it('shows a loader until the component is registered', async () => {
    await render({ component: { componentName: 'registered-later' } });

    expect(screen.getByRole('img', { name: 'Laster innhold' })).toHaveAttribute('data-loading');

    act(() =>
      registerComponent({
        name: 'registered-later',
        component: () => <div>registered later</div>,
        apiVersion: CUSTOM_REACT_API_VERSION,
      }),
    );

    expect(screen.getByText('registered later')).toBeInTheDocument();
  });

  it('shows an error that stops PDF generation when the component is never registered', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const logError = vi.spyOn(window, 'logError').mockImplementation(() => {});
    await render({ component: { componentName: 'never-registered' } });

    act(() => vi.advanceTimersByTime(REGISTRATION_TIMEOUT_MS));

    const error = screen.getByText('Denne delen av skjemaet kunne ikke vises. Prøv å laste inn siden på nytt.');
    expect(error.closest('[data-fatal-error]')).toBeInTheDocument();
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('React component "never-registered"'));
  });
});

const render = async ({
  component,
  renderer = (props) => <CustomReactComponent {...props} />,
  ...rest
}: Partial<RenderGenericComponentTestProps<'CustomReact'>> = {}) =>
  await renderGenericComponentTest({
    type: 'CustomReact',
    renderer,
    component: {
      componentName: 'test-component',
      required: true,
      dataModelBindings: {
        value: { dataType: defaultDataTypeMock, field: 'myValue' },
      },
      textResourceBindings: {
        title: 'my.title',
        extraText: 'my.extra.text',
      },
      options: { buttonText: 'Set to 42' },
      ...component,
    },
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((obj) => {
          obj.dataModels[defaultDataTypeMock].initialData = { myValue: 5 };
        }),
    },
    ...rest,
  });

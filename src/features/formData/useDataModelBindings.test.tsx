import React from 'react';

import { afterAll, beforeAll, jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { FD } from 'src/features/formData/FormDataWrite';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IDataModelPatchResponse } from 'src/features/formData/types';

describe('useDataModelBindings', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  function DummyComponent() {
    const debounce = FD.useDebounceImmediately();
    const { formData, setValue, setValues, isValid } = useDataModelBindings({
      stringy: { field: 'stringyField', dataType: defaultDataTypeMock },
      decimal: { field: 'decimalField', dataType: defaultDataTypeMock },
      integer: { field: 'integerField', dataType: defaultDataTypeMock },
      boolean: { field: 'booleanField', dataType: defaultDataTypeMock },
    });

    return (
      <>
        <div data-testid='value-stringy'>{JSON.stringify(formData.stringy)}</div>
        <div data-testid='value-decimal'>{JSON.stringify(formData.decimal)}</div>
        <div data-testid='value-integer'>{JSON.stringify(formData.integer)}</div>
        <div data-testid='value-boolean'>{JSON.stringify(formData.boolean)}</div>
        <div data-testid='isValid-stringy'>{isValid.stringy ? 'yes' : 'no'}</div>
        <div data-testid='isValid-decimal'>{isValid.decimal ? 'yes' : 'no'}</div>
        <div data-testid='isValid-integer'>{isValid.integer ? 'yes' : 'no'}</div>
        <div data-testid='isValid-boolean'>{isValid.boolean ? 'yes' : 'no'}</div>
        <input
          type='text'
          data-testid='input-stringy'
          value={formData.stringy}
          onChange={(e) => setValue('stringy', e.target.value)}
        />
        <input
          type='text'
          data-testid='input-decimal'
          value={formData.decimal}
          onChange={(e) => setValue('decimal', e.target.value)}
        />
        <input
          type='text'
          data-testid='input-integer'
          value={formData.integer}
          onChange={(e) => setValue('integer', e.target.value)}
        />
        <input
          type='text'
          data-testid='input-boolean'
          value={formData.boolean}
          onChange={(e) => setValue('boolean', e.target.value)}
        />
        <button
          onClick={() =>
            setValues({
              stringy: 'foo bar',
              decimal: '12345.6789',
              integer: '987654321',
              boolean: 'true',
            })
          }
        >
          Set multiple values at once, using strings
        </button>
        <button
          onClick={() =>
            setValues({
              stringy: 'hello world',
              decimal: 98765.4321,
              integer: 123456789,
              boolean: false,
            })
          }
        >
          Set multiple values at once, using real types
        </button>
        <button onClick={() => debounce('forced')}>Debounce</button>
      </>
    );
  }

  async function render({ formData = {} }: { formData?: object } = {}) {
    return await renderWithInstanceAndLayout({
      renderer: <DummyComponent />,
      queries: {
        fetchFormData: async () => formData,
        fetchDataModelSchema: async () => ({
          type: 'object',
          properties: {
            stringyField: { type: 'string' },
            decimalField: { type: 'number' },
            integerField: { type: 'integer' },
            booleanField: { type: 'boolean' },
          },
        }),
      },
    });
  }

  it('should work as expected', async () => {
    const user = userEvent.setup({ delay: null });
    const { formDataMethods, mutations } = await render();

    expect(screen.getByTestId('value-stringy')).toHaveTextContent('""');
    expect(screen.getByTestId('value-decimal')).toHaveTextContent('""');
    expect(screen.getByTestId('value-boolean')).toHaveTextContent('""');
    expect(screen.getByTestId('isValid-stringy')).toHaveTextContent('yes');
    expect(screen.getByTestId('isValid-decimal')).toHaveTextContent('yes');
    expect(screen.getByTestId('isValid-boolean')).toHaveTextContent('yes');

    const fooBar = 'foo bar';
    await user.type(screen.getByTestId('input-stringy'), fooBar);
    expect(screen.getByTestId('value-stringy')).toHaveTextContent(`"${fooBar}"`);
    expect(screen.getByTestId('isValid-stringy')).toHaveTextContent('yes');

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'stringyField', dataType: defaultDataTypeMock },
      newValue: fooBar,
    });
    expect(formDataMethods.setLeafValue).toHaveBeenCalledTimes(fooBar.length);
    (formDataMethods.setLeafValue as jest.Mock).mockClear();

    // Now to slightly harder things. Let's try to set a negative decimal value. When first starting typing, the
    // value is invalid, but when the user has typed more than just the minus sign, it should be a valid decimal
    await user.type(screen.getByTestId('input-decimal'), '-');
    expect(screen.getByTestId('value-decimal')).toHaveTextContent(`"-"`);
    expect(screen.getByTestId('isValid-decimal')).toHaveTextContent('no');

    expect(formDataMethods.setLeafValue).toHaveBeenCalledTimes(1);
    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'decimalField', dataType: defaultDataTypeMock },
      newValue: '-',
    });

    // When we simulate a save to server, the invalid value should not be saved
    jest.advanceTimersByTime(1000);
    await waitFor(() => expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(1));
    expect(mutations.doPatchFormData.mock).toHaveBeenCalledWith(
      expect.stringMatching(/\/data\//),
      expect.objectContaining({
        patch: [{ op: 'add', path: '/stringyField', value: 'foo bar' }],
      }),
    );
    const response: IDataModelPatchResponse = {
      newDataModel: {
        stringyField: 'foo bar',
      },
      validationIssues: {},
    };
    mutations.doPatchFormData.resolve(response);

    const fullDecimal = '-1.53';
    await user.type(screen.getByTestId('input-decimal'), fullDecimal.slice(1));
    expect(screen.getByTestId('value-decimal')).toHaveTextContent(`"-1.53"`);
    expect(screen.getByTestId('isValid-decimal')).toHaveTextContent('yes');

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'decimalField', dataType: defaultDataTypeMock },
      newValue: '-1.53', // Inputs are passed as strings
    });
    expect(formDataMethods.setLeafValue).toHaveBeenCalledTimes(fullDecimal.length);

    (formDataMethods.setLeafValue as jest.Mock).mockClear();

    // Now to slightly harder things. Let's try to set a negative integer value. When first starting typing, the
    // value is invalid, but when the user has typed more than just the minus sign, it should be a valid integer
    await user.type(screen.getByTestId('input-integer'), '-');
    expect(screen.getByTestId('value-integer')).toHaveTextContent(`"-"`);
    expect(screen.getByTestId('isValid-integer')).toHaveTextContent('no');

    expect(formDataMethods.setLeafValue).toHaveBeenCalledTimes(1);
    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'integerField', dataType: defaultDataTypeMock },
      newValue: '-',
    });

    // When we simulate a save to server, the invalid value should not be saved
    jest.advanceTimersByTime(1000);
    await waitFor(() => expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(2));
    expect(mutations.doPatchFormData.mock).toHaveBeenCalledWith(
      expect.stringMatching(/\/data\//),
      expect.objectContaining({
        // But now we expect the decimal value we typed earlier to be saved
        patch: [{ op: 'add', path: '/decimalField', value: -1.53 }],
      }),
    );
    const response2: IDataModelPatchResponse = {
      newDataModel: {
        stringyField: 'foo bar',
        decimalField: -1.53,
      },
      validationIssues: {},
    };
    mutations.doPatchFormData.resolve(response2);

    const fullInteger = '-15 3';
    await user.type(screen.getByTestId('input-integer'), fullInteger.slice(1));

    expect(screen.getByTestId('value-integer')).toHaveTextContent(`"-153"`);
    expect(screen.getByTestId('isValid-integer')).toHaveTextContent('yes');

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'integerField', dataType: defaultDataTypeMock },
      newValue: '-153', // Inputs are passed as strings
    });

    expect(formDataMethods.setLeafValue).toHaveBeenCalledTimes(fullInteger.length);

    (formDataMethods.setLeafValue as jest.Mock).mockClear();

    // At last, type in a boolean value
    await user.type(screen.getByTestId('input-boolean'), 'tr');
    expect(screen.getByTestId('value-boolean')).toHaveTextContent(`"tr"`);
    expect(screen.getByTestId('isValid-boolean')).toHaveTextContent('no');

    await user.type(screen.getByTestId('input-boolean'), 'ue');
    expect(screen.getByTestId('value-boolean')).toHaveTextContent(`"true"`);
    expect(screen.getByTestId('isValid-boolean')).toHaveTextContent('yes');

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'booleanField', dataType: defaultDataTypeMock },
      newValue: 'true', // Inputs are passed as strings
    });
    expect(formDataMethods.setLeafValue).toHaveBeenCalledTimes(4);

    await waitFor(() => expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(3));
    expect(mutations.doPatchFormData.mock).toHaveBeenCalledWith(
      expect.stringMatching(/\/data\//),
      expect.objectContaining({
        // Now we expect the integer and boolean values to be saved
        patch: [
          { op: 'add', path: '/integerField', value: -153 },
          { op: 'add', path: '/booleanField', value: true },
        ],
      }),
    );
  });

  it('should load initial values from formData', async () => {
    await render({ formData: { stringyField: 'foo', decimalField: 123, booleanField: true } });
    expect(screen.getByTestId('value-stringy')).toHaveTextContent('"foo"');
    expect(screen.getByTestId('value-decimal')).toHaveTextContent('"123"');
    expect(screen.getByTestId('value-boolean')).toHaveTextContent('"true"');
  });
});

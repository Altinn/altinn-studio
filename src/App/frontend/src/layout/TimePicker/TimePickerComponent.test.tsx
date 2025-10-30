import React from 'react';

import { screen } from '@testing-library/react';

import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { TimePickerComponent } from 'src/layout/TimePicker/TimePickerComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';

describe('TimePickerComponent', () => {
  it('should render time picker with label', async () => {
    await renderGenericComponentTest({
      type: 'TimePicker',
      renderer: (props) => <TimePickerComponent {...props} />,
      component: {
        id: 'time-picker',
        type: 'TimePicker',
        dataModelBindings: {
          simpleBinding: { dataType: defaultDataTypeMock, field: 'time' },
        },
        textResourceBindings: {
          title: 'Select time',
        },
        required: false,
        readOnly: false,
      },
    });

    const label = screen.getByText('Select time');
    expect(label).toBeInTheDocument();

    // Verify that the individual time input segments are present
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThanOrEqual(2); // At least hours and minutes
  });

  it('should render time input fields with translated labels', async () => {
    await renderGenericComponentTest({
      type: 'TimePicker',
      renderer: (props) => <TimePickerComponent {...props} />,
      component: {
        id: 'time-picker',
        type: 'TimePicker',
        dataModelBindings: {
          simpleBinding: { dataType: defaultDataTypeMock, field: 'time' },
        },
        format: 'HH:mm',
        textResourceBindings: {
          title: 'Time input',
        },
      },
    });

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(2); // Hours and minutes

    // Check that inputs have translated aria-labels
    expect(inputs[0]).toHaveAttribute('aria-label', 'Timer'); // Norwegian for 'Hours'
    expect(inputs[1]).toHaveAttribute('aria-label', 'Minutter'); // Norwegian for 'Minutes'
  });

  it('should render with 12-hour format', async () => {
    await renderGenericComponentTest({
      type: 'TimePicker',
      renderer: (props) => <TimePickerComponent {...props} />,
      component: {
        id: 'time-picker',
        type: 'TimePicker',
        dataModelBindings: {
          simpleBinding: { dataType: defaultDataTypeMock, field: 'time' },
        },
        format: 'hh:mm a',
      },
    });

    // Check that AM/PM segment is rendered for 12-hour format
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(3); // Hours, minutes, and AM/PM period

    // Find the AM/PM input specifically
    const periodInput = inputs.find(
      (input) => input.getAttribute('aria-label')?.includes('AM/PM') || input.getAttribute('placeholder') === 'AM',
    );
    expect(periodInput).toBeInTheDocument();
  });

  it('should show seconds when format includes seconds', async () => {
    await renderGenericComponentTest({
      type: 'TimePicker',
      renderer: (props) => <TimePickerComponent {...props} />,
      component: {
        id: 'time-picker',
        type: 'TimePicker',
        dataModelBindings: {
          simpleBinding: { dataType: defaultDataTypeMock, field: 'time' },
        },
        format: 'HH:mm:ss',
      },
    });

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(3); // Hours, minutes, and seconds
  });

  it('should be disabled when readOnly is true', async () => {
    await renderGenericComponentTest({
      type: 'TimePicker',
      renderer: (props) => <TimePickerComponent {...props} />,
      component: {
        id: 'time-picker',
        type: 'TimePicker',
        dataModelBindings: {
          simpleBinding: { dataType: defaultDataTypeMock, field: 'time' },
        },
        readOnly: true,
      },
    });

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });
});

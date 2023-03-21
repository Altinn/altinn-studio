import React from 'react';
import { Provider } from 'react-redux';

import { render, screen } from '@testing-library/react';
import configureStore from 'redux-mock-store';

import { Legend } from 'src/features/form/components/Legend';
import type { IFormLegendProps } from 'src/features/form/components/Legend';

describe('Legend', () => {
  const requiredMarking = '*';
  const optionalMarking = 'Valgfri';

  function renderLegendComponent(props: Partial<IFormLegendProps> = {}) {
    const createStore = configureStore();
    const mockLanguage = {
      general: {
        optional: optionalMarking,
      },
      form_filler: {
        required_label: requiredMarking,
      },
    };
    const defaultProps: IFormLegendProps = {
      id: 'label1',
      labelText: 'label.text',
      descriptionText: '',
      helpText: '',
      language: mockLanguage,
      required: false,
      labelSettings: {},
    };

    const mockStore = createStore({ language: { language: mockLanguage } });

    return render(
      <Provider store={mockStore}>
        <Legend
          {...defaultProps}
          {...props}
        />
      </Provider>,
    );
  }

  it('should render legend', () => {
    renderLegendComponent();
    expect(screen.getByText('label.text')).toBeInTheDocument();
  });

  it('should render required marking when field is required', () => {
    renderLegendComponent({ required: true });
    expect(screen.getByText(requiredMarking)).toBeTruthy();
  });

  it('should render optional marking when labelSettings.optionalIndicator is true', () => {
    renderLegendComponent({
      labelSettings: { optionalIndicator: true },
    });
    expect(screen.getByText(`(${optionalMarking})`)).toBeTruthy();
  });

  it('should not render optional marking when required, even if labelSettings.optionalIndicator is true', () => {
    renderLegendComponent({
      labelSettings: { optionalIndicator: true },
      required: true,
    });
    expect(screen.queryByText(`(${optionalMarking})`)).toBeFalsy();
  });
});

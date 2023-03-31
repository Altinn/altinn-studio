import React from 'react';
import { Provider } from 'react-redux';

import { render, screen } from '@testing-library/react';
import configureStore from 'redux-mock-store';

import { Label } from 'src/components/form/Label';
import type { IFormLabelProps } from 'src/components/form/Label';

describe('Label', () => {
  const requiredMarking = '*';
  const optionalMarking = 'Valgfri';

  it('should render label', () => {
    renderLabelComponent();
    expect(screen.getByText('label.text')).toBeInTheDocument();
  });

  it('should render required marking when field is required', () => {
    renderLabelComponent({ required: true });
    expect(screen.getByText(requiredMarking)).toBeTruthy();
  });

  it('should not render required marking when field is readOnly', () => {
    renderLabelComponent({
      required: true,
      readOnly: true,
    });
    expect(screen.queryByText(requiredMarking)).toBeFalsy();
  });

  it('should render optional marking when labelSettings.optionalIndicator is true, and required, readOnly are both false', () => {
    renderLabelComponent({
      labelSettings: { optionalIndicator: true },
    });
    expect(screen.getByText(`(${optionalMarking})`)).toBeTruthy();
  });

  it('should not render optional marking when required, even if labelSettings.optionalIndicator is true', () => {
    renderLabelComponent({
      labelSettings: { optionalIndicator: true },
      required: true,
    });
    expect(screen.queryByText(` (${optionalMarking})`)).toBeFalsy();
  });

  it('should not render optional marking when readOnly, even if labelSettings.optionalIndicator is true', () => {
    renderLabelComponent({
      labelSettings: { optionalIndicator: true },
      readOnly: true,
    });
    expect(screen.queryByText(` (${optionalMarking})`)).toBeFalsy();
  });

  function renderLabelComponent(props: Partial<IFormLabelProps> = {}) {
    const createStore = configureStore();
    const mockLanguage = {
      general: {
        optional: optionalMarking,
      },
      form_filler: {
        required_label: requiredMarking,
      },
    };

    const defaultProps: IFormLabelProps = {
      id: 'label1',
      labelText: 'label.text',
      helpText: '',
      language: mockLanguage,
      readOnly: false,
      required: false,
      labelSettings: {
        optionalIndicator: true,
      },
    };

    const mockStore = createStore({ language: { language: mockLanguage } });

    return render(
      <Provider store={mockStore}>
        <Label
          {...defaultProps}
          {...props}
        />
      </Provider>,
    );
  }
});

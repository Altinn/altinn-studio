import * as React from 'react';
import { render } from '@testing-library/react';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';

import Label from './Label';
import type { IFormLabelProps } from './Label';


describe('features > form > components >Label.tsx', () => {
  const requiredMarking = '*';
  const optionalMarking = 'Valgfri';

  it('should render label', () => {
    const { queryByText } = renderLabelComponent();
    expect(queryByText('label.text')).toBeInTheDocument();
  })

  it('should render required marking when field is required', () => {
    const { queryByText } = renderLabelComponent({ required: true });
    expect(queryByText(requiredMarking)).toBeTruthy();
  });

  it('should not render required marking when field is readOnly', () => {
    const { queryByText } = renderLabelComponent({ required: true, readOnly: true });
    expect(queryByText(requiredMarking)).toBeFalsy();
  });

  it('should render optional marking when labelSettings.optionalIndicator is true, and required, readOnly are both false', () => {
    const { queryByText } = renderLabelComponent({ labelSettings: { optionalIndicator: true } });
    expect(queryByText(`(${optionalMarking})`)).toBeTruthy();
  });

  it('should not render optional marking when required, even if labelSettings.optionalIndicator is true', () => {
    const { queryByText } = renderLabelComponent({ labelSettings: { optionalIndicator: true }, required: true });
    expect(queryByText(` (${optionalMarking})`)).toBeFalsy();
  });

  it('should not render optional marking when readOnly, even if labelSettings.optionalIndicator is true', () => {
    const { queryByText } = renderLabelComponent({ labelSettings: { optionalIndicator: true }, readOnly: true });
    expect(queryByText(` (${optionalMarking})`)).toBeFalsy();
  });

  function renderLabelComponent(props: Partial<IFormLabelProps> = {}) {
    const createStore = configureStore();
    const mockLanguage = {
      general: {
        optional: optionalMarking,
      },
      'form_filler': {
        'required_label': requiredMarking,
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
      }
    };

    const mockStore = createStore({ language: { language: mockLanguage } });

    return render(
      <Provider store={mockStore}>
        <Label {...defaultProps} {...props} />
      </Provider>

    );
  }
});

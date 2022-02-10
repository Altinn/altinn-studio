import React from 'react';
import { screen } from '@testing-library/react';

import { renderWithProviders } from '../../testUtils';

import { GenericComponent } from './GenericComponent';
import type { IGenericComponentProps } from './GenericComponent';
import {
  getFormDataStateMock,
  getFormLayoutStateMock,
} from '../../__mocks__/mocks';

const render = (props: Partial<IGenericComponentProps> = {}) => {
  const allProps: IGenericComponentProps = {
    id: 'mockId',
    type: 'type',
    textResourceBindings: {},
    dataModelBindings: {},
    ...props,
  };

  const formLayout = getFormLayoutStateMock({
    layouts: {
      FormLayout: [
        {
          type: 'Input',
          id: 'mockId',
          dataModelBindings: {
            simpleBiding: 'mockDataBinding',
          },
          readOnly: false,
          required: false,
          disabled: false,
          textResourceBindings: {},
          triggers: [],
          grid: {
            xs: 12,
            sm: 10,
            md: 8,
            lg: 6,
            xl: 4,
            innerGrid: {
              xs: 11,
              sm: 9,
              md: 7,
              lg: 5,
              xl: 3,
            },
          },
        },
      ],
    },
  });

  const formData = getFormDataStateMock({
    formData: {
      mockDataBinding: 'value',
    },
  });

  renderWithProviders(<GenericComponent {...allProps} />, {
    preloadedState: {
      formLayout,
      formData,
    },
  });
};

describe('GenericComponent', () => {
  it('should render Unknown component when passing unknown type', () => {
    render({ type: 'unknown-type' });

    expect(screen.getByText(/unknown component type/i)).toBeInTheDocument();
  });

  it('should render Input component when passing Input type', () => {
    render({ type: 'Input' });

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(
      screen.queryByText(/unknown component type/i),
    ).not.toBeInTheDocument();
  });

  it('should render description and label when textResourceBindings includes description and title', () => {
    render({
      type: 'Input',
      textResourceBindings: {
        title: 'titleKey',
        description: 'descriptionKey',
      },
    });

    expect(screen.getByTestId('description-mockId')).toBeInTheDocument();
    expect(screen.getByTestId('label-mockId')).toBeInTheDocument();
  });

  it('should not render description and label when textResourceBindings does not include description and title', () => {
    render({
      type: 'Input',
      textResourceBindings: {},
    });

    expect(screen.queryByTestId('description-mockId')).not.toBeInTheDocument();
    expect(screen.queryByTestId('label-mockId')).not.toBeInTheDocument();
  });

  it('should not render description and label when textResourceBindings includes description and title, but the component is listed in "noLabelComponents"', () => {
    render({
      type: 'NavigationBar',
      textResourceBindings: {
        title: 'titleKey',
        description: 'descriptionKey',
      },
    });

    expect(screen.queryByTestId('description-mockId')).not.toBeInTheDocument();
    expect(screen.queryByTestId('label-mockId')).not.toBeInTheDocument();
  });
});

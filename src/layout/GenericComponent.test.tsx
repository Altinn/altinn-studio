import React from 'react';

import { screen } from '@testing-library/react';

import { getFormDataStateMock } from 'src/__mocks__/formDataStateMock';
import { getFormLayoutStateMock } from 'src/__mocks__/formLayoutStateMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { GenericComponent } from 'src/layout/GenericComponent';
import { mockComponentProps, renderWithProviders } from 'src/testUtils';
import type { IActualGenericComponentProps } from 'src/layout/GenericComponent';

const render = (props: Partial<IActualGenericComponentProps<any>> = {}) => {
  const allProps: IActualGenericComponentProps<'Input'> = {
    ...mockComponentProps,
    id: 'mockId',
    type: 'Input' as any,
    textResourceBindings: {},
    dataModelBindings: {},
    ...props,
  };

  const formLayout = getFormLayoutStateMock({
    layouts: {
      FormLayout: [
        {
          ...mockComponentProps,
          type: 'Input',
          id: 'mockId',
          dataModelBindings: {
            simpleBinding: 'mockDataBinding',
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
          ...props,
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
      ...getInitialStateMock(),
      formLayout,
      formData,
    },
  });
};

describe('GenericComponent', () => {
  it('should render Unknown component when passing unknown type', () => {
    render({ type: 'unknown-type' } as any);

    expect(screen.getByText(/unknown component type/i)).toBeInTheDocument();
  });

  it('should render Input component when passing Input type', () => {
    render({ type: 'Input' });

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByText(/unknown component type/i)).not.toBeInTheDocument();
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

import React from 'react';

import { screen } from '@testing-library/react';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { SoftValidations } from 'src/components/form/SoftValidations';
import { FormComponentContext } from 'src/layout';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { ISoftValidationProps, SoftValidationVariant } from 'src/components/form/SoftValidations';
import type { IFormComponentContext } from 'src/layout';
import type { IRuntimeState } from 'src/types';

const render = async (
  props: Partial<ISoftValidationProps> = {},
  suppliedState: Partial<IRuntimeState> = {},
  suppliedContext: Partial<IFormComponentContext> = {},
) => {
  const allProps: ISoftValidationProps = {
    variant: 'info',
    errorMessages: ['Some message'],
    ...props,
  };

  await renderWithInstanceAndLayout({
    renderer: () => (
      <FormComponentContext.Provider value={suppliedContext}>
        <SoftValidations {...allProps} />
      </FormComponentContext.Provider>
    ),
    reduxState: {
      ...getInitialStateMock(),
      ...suppliedState,
    },
  });
};

describe('SoftValidations', () => {
  it.each(['info', 'warning', 'success'])(
    'for variant %p it should render the message',
    async (variant: SoftValidationVariant) => {
      await render({ variant });

      const message = screen.getByText('Some message');
      expect(message).toBeInTheDocument();
    },
  );
});

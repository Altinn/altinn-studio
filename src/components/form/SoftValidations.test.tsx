import React from 'react';

import { screen } from '@testing-library/react';

import { SoftValidations } from 'src/components/form/SoftValidations';
import { FormComponentContextProvider } from 'src/layout/FormComponentContext';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { ISoftValidationProps, SoftValidationVariant } from 'src/components/form/SoftValidations';
import type { IFormComponentContext } from 'src/layout/FormComponentContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

const render = async (
  props: Partial<ISoftValidationProps> = {},
  suppliedContext: Partial<IFormComponentContext> = {},
) => {
  const allProps: ISoftValidationProps = {
    variant: 'info',
    errorMessages: ['Some message'],
    ...props,
  };

  await renderWithInstanceAndLayout({
    renderer: () => (
      <FormComponentContextProvider
        value={{
          baseComponentId: undefined,
          id: 'some-id',
          node: undefined as unknown as LayoutNode,
          ...suppliedContext,
        }}
      >
        <SoftValidations {...allProps} />
      </FormComponentContextProvider>
    ),
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

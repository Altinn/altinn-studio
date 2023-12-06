import React from 'react';

import { screen } from '@testing-library/react';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { SoftValidations } from 'src/components/form/SoftValidations';
import { FormComponentContextProvider } from 'src/layout/FormComponentContext';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { ISoftValidationProps, SoftValidationVariant } from 'src/components/form/SoftValidations';
import type { IFormComponentContext } from 'src/layout/FormComponentContext';
import type { IRuntimeState } from 'src/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

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

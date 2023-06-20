import React from 'react';

import { screen } from '@testing-library/react';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { getPanelTitle, SoftValidations } from 'src/components/form/SoftValidations';
import { staticUseLanguageForTests } from 'src/hooks/useLanguage';
import { FormComponentContext } from 'src/layout';
import { renderWithProviders } from 'src/testUtils';
import type { ISoftValidationProps, SoftValidationVariant } from 'src/components/form/SoftValidations';
import type { IFormComponentContext } from 'src/layout';
import type { IRuntimeState } from 'src/types';

const render = (
  props: Partial<ISoftValidationProps> = {},
  suppliedState: Partial<IRuntimeState> = {},
  suppliedContext: Partial<IFormComponentContext> = {},
) => {
  const allProps: ISoftValidationProps = {
    variant: 'info',
    children: (
      <ol>
        <li>Some message</li>
      </ol>
    ),
    ...props,
  };

  renderWithProviders(
    <FormComponentContext.Provider value={suppliedContext}>
      <SoftValidations {...allProps} />
    </FormComponentContext.Provider>,
    {
      preloadedState: {
        ...getInitialStateMock(),
        ...suppliedState,
      },
    },
  );
};

describe('SoftValidations', () => {
  it.each(['info', 'warning', 'success'])(
    'for variant %p it should render the message with correct title',
    (variant: SoftValidationVariant) => {
      const langTools = staticUseLanguageForTests();
      render({ variant });

      const message = screen.getByText('Some message');
      expect(message).toBeInTheDocument();

      const title = screen.getByText(getPanelTitle({ variant, langTools }));
      expect(title).toBeInTheDocument();
    },
  );

  it.each(['info', 'warning', 'success'])(
    'for variant %p it should render the message with overridden title if supplied by app',
    (variant: SoftValidationVariant) => {
      const expectedTitle = {
        info: 'Lurt å tenke på',
        warning: 'OBS',
        success: 'Så flott!',
      };
      render({ variant });

      const message = screen.getByText('Some message');
      expect(message).toBeInTheDocument();

      const title = screen.getByText(expectedTitle[variant]);
      expect(title).toBeInTheDocument();
    },
  );
});

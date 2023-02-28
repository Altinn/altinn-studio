import React from 'react';

import { render as renderRtl, screen } from '@testing-library/react';

import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';
import type { IHelpTextContainerProps } from 'src/features/form/components/HelpTextContainer';
import type { ILanguage } from 'src/types/shared';

describe('HelpTextContainer', () => {
  const language: ILanguage = {
    helptext: {
      button_title: 'Help',
      button_title_prefix: 'Helptext for',
    },
  };
  const render = (props?: Partial<IHelpTextContainerProps>) => {
    renderRtl(
      <HelpTextContainer
        language={language}
        helpText={'Help text content'}
        {...props}
      />,
    );
  };

  it('receives correct accessible title', () => {
    render();
    expect(
      screen.getByRole('button', {
        name: /help/i,
      }),
    ).toBeInTheDocument();

    render({ title: 'My labelname' });

    expect(
      screen.getByRole('button', {
        name: /helptext for my labelname/i,
      }),
    ).toBeInTheDocument();
  });
});

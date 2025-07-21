import React from 'react';
import type { ReactElement } from 'react';
import type { Preview } from '@storybook/react-vite';
import { DocsContainer } from '@storybook/addon-docs/blocks';
import { Unstyled } from '@storybook/addon-docs/blocks';

import '@digdir/designsystemet-css';
import '@digdir/designsystemet-theme';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    actions: { argTypesRegex: '^on.*' },
    controls: {
      default: 'expanded',
      expanded: true,
    },

    docs: {
      container: ({ children, context }) => (
        <DocsContainer context={context}>
          <Unstyled>{children}</Unstyled>
        </DocsContainer>
      ),
    },
    options: {
      storySort: {
        method: 'alphabetical',
      },
    },
  },
  decorators: [
    (Story): ReactElement => (
      <div data-size='sm'>
        <Story />
      </div>
    ),
  ],
};

export default preview;

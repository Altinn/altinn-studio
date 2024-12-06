import React from 'react';
import type { Preview } from '@storybook/react';
import { DocsContainer } from '@storybook/addon-docs';
import { Unstyled } from '@storybook/blocks';

import '@altinn/figma-design-tokens/dist/tokens.css';
import '@digdir/design-system-tokens/brand/altinn/tokens.css';
import '@digdir/designsystemet-css';

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
};

export default preview;

import React from 'react';
import type { Preview } from '@storybook/react';
import { DocsContainer } from '@storybook/addon-docs';
import { Unstyled } from '@storybook/blocks';

import '@digdir/designsystemet-theme/brand/altinn/tokens.css';
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
  },
};

export default preview;

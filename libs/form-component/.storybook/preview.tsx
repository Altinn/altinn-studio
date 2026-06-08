import '@digdir/designsystemet-css';
import '@digdir/designsystemet-css/theme';

import type { Preview } from '@storybook/react-vite';

import { withLanguageTranslator } from './withLanguageTranslator';

import '@app/form-component/styles/global.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    withLanguageTranslator,
    (Story) => (
      <div data-color-scheme='light' data-size='md'>
        <Story />
      </div>
    ),
  ],
};

export default preview;

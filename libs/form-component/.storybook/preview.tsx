import '@digdir/designsystemet-css';
import '@digdir/designsystemet-css/theme';

import type { Preview } from '@storybook/react-vite';

import '@app/form-component/styles/global.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div data-color-scheme='light' data-size='md'>
        <Story />
      </div>
    ),
  ],
};

export default preview;

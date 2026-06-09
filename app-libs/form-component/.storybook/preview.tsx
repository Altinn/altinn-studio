import '@digdir/designsystemet-css';
import '@digdir/designsystemet-css/theme';

import { StaticLanguageTranslatorProvider } from '@app/form-component/test/StaticLanguageTranslatorProvider';
import type { Preview } from '@storybook/react-vite';

import '@app/form-component/styles/global.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    // Provide the real translations from @app/language so components using useTranslation() render translated text.
    (Story) => (
      <StaticLanguageTranslatorProvider>
        <Story />
      </StaticLanguageTranslatorProvider>
    ),
    (Story) => (
      <div data-color-scheme='light' data-size='md'>
        <Story />
      </div>
    ),
  ],
};

export default preview;

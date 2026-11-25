import '@digdir/designsystemet-css';
import '@digdir/designsystemet-css/theme';

import type { Preview } from '@storybook/react-vite';

import {
  type StaticLanguageCode,
  StaticLanguageTranslatorProvider,
} from '../src/test/StaticLanguageTranslatorProvider';

import '../src/styles/global.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  initialGlobals: {
    locale: 'nb' satisfies StaticLanguageCode,
  },
  globalTypes: {
    locale: {
      description:
        'Select language used for built-in application text — example texts passed to components in stories are not translated',
      toolbar: {
        title: 'Language',
        icon: 'globe',
        items: [
          { value: 'nb', title: 'Norsk (nb)' },
          { value: 'nn', title: 'Norsk (nn)' },
          { value: 'en', title: 'English' },
        ] satisfies { value: StaticLanguageCode; title: string }[],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    // Provide the real translations from @app/language so components using useTranslation() render translated text.
    (Story, context) => (
      <StaticLanguageTranslatorProvider language={context.globals.locale as StaticLanguageCode}>
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

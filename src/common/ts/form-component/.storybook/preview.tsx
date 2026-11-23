import '@digdir/designsystemet-css';
import '@digdir/designsystemet-css/theme';

import {
  type StaticLanguageCode,
  StaticLanguageTranslatorProvider,
} from '@app/form-component/test/StaticLanguageTranslatorProvider';
import type { Preview } from '@storybook/react-vite';

import '@app/form-component/styles/global.css';

type PageWidth = 'standard' | 'expanded';

/**
 * The widest the app lets form content be at standard width: the page card's max width less its side padding. With
 * side navigation that is 1040 - 2 * 40, without it 1152 - 2 * 96. See Presentation.module.css in the App frontend.
 */
const STANDARD_CONTENT_MAX_WIDTH = '960px';

const preview: Preview = {
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  initialGlobals: {
    locale: 'nb' satisfies StaticLanguageCode,
    pageWidth: 'standard' satisfies PageWidth,
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
    pageWidth: {
      description: 'Show stories at the width the app gives form content, standard or expanded',
      toolbar: {
        title: 'Page width',
        icon: 'expand',
        items: [
          { value: 'standard', title: 'Standard width' },
          { value: 'expanded', title: 'Expanded width' },
        ] satisfies { value: PageWidth; title: string }[],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => (
      <div
        style={{
          maxWidth:
            context.globals.pageWidth === 'expanded' ? undefined : STANDARD_CONTENT_MAX_WIDTH,
        }}
      >
        <Story />
      </div>
    ),
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

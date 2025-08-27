import { addons } from 'storybook/manager-api';
import studioTheme from './studioTheme';

addons.setConfig({
  theme: studioTheme,
  sidebar: {
    showRoots: true,
  },
});

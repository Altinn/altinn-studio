import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import throttle from 'lodash-es/throttle';
import { DASHBOARD_BASENAME } from 'app-shared/constants';
import { App } from './app/App';
import { run } from './app/rootSaga';
import { loadFromLocalStorage, saveToLocalStorage } from './utils/localStorageUtils';
import { setupStore } from './app/store';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import nb from '../language/src/nb.json';
import en from '../language/src/en.json';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

i18next.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  resources: {
    nb: { translation: nb },
    en: { translation: en },
  },
  fallbackLng: 'nb',
});

const store = setupStore(loadFromLocalStorage());
store.subscribe(
  throttle(() => {
    saveToLocalStorage(store.getState());
  }, 2000)
);

/**
 * Setup all Sagas to listen to the defined events
 */
run();

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <Provider store={store}>
    <BrowserRouter basename={DASHBOARD_BASENAME}>
      <App />
    </BrowserRouter>
  </Provider>
);

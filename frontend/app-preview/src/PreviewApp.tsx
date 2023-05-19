import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { LandingPage } from './views/LandingPage';
import { NoMatch } from './views/NoMatch';
import classes from './PreviewApp.module.css';
import { DEFAULT_LANGUAGE } from "app-shared/constants";
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import nb from '../../language/src/nb.json';
import en from '../../language/src/en.json';

i18next.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  resources: {
    nb: { translation: nb },
    en: { translation: en },
  },
  fallbackLng: 'nb',
  react: {
    transSupportBasicHtmlNodes: true,
    transKeepBasicHtmlNodesFor: ['em'],
  },
});

export const PreviewApp = () => {
  return (
    <div className={classes.previewContainer}>
      <Routes>
        <Route path='/:org/:app' element={<LandingPage />} />
        <Route path='*' element={<NoMatch />} />
      </Routes>
    </div>
  );
};

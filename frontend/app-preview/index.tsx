import React from 'react';
import { createRoot } from 'react-dom/client';
import { PreviewApp } from './src/PreviewApp';
import { BrowserRouter } from 'react-router-dom';
import { PREVIEW_BASENAME } from 'app-shared/constants';
import { PreviewConnectionContextProvider } from "app-shared/providers/PreviewConnectionContext";

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <PreviewConnectionContextProvider>
    <BrowserRouter basename={PREVIEW_BASENAME}>
      <PreviewApp/>
    </BrowserRouter>
  </PreviewConnectionContextProvider>
);

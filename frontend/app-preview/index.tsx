import React from 'react';
import { createRoot } from 'react-dom/client';
import { PreviewApp } from './src/PreviewApp';
import { BrowserRouter } from 'react-router-dom';
//import { PREVIEW_BASENAME } from 'app-shared/constants';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <BrowserRouter>
      <PreviewApp />
  </BrowserRouter>
);

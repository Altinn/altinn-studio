import React from 'react';
import { createRoot } from 'react-dom/client';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  const root = container && createRoot(container);
  root?.render(<h1>Hello world</h1>);
});

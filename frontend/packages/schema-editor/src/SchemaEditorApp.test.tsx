import React from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { render, screen } from '@testing-library/react';
import { SchemaEditorApp } from './SchemaEditorApp';
import { dataMock } from './mockData';
import { mockUseTranslation } from '../../../testing/mocks/i18nMock';

let container: any = null;

// Mocks:
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation() }));

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  unmountComponentAtNode(container);
  container.remove();
  container = null;
});

test('renders schema editor app', () => {
  render(
    <SchemaEditorApp
      schema={dataMock}
      onSaveSchema={jest.fn()}
      name='test'
      LandingPagePanel={<div>landing page panel goes here</div>}
    />
  );
  expect(screen.getByTestId('schema-editor')).toBeDefined();
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import SchemaEditorApp from './SchemaEditorApp';

test('renders learn react link', () => {
  render(<SchemaEditorApp schema={{}} onSaveSchema={() => {}} />);
});

import React from 'react';
import { screen } from '@testing-library/react';

import { renderWithProviders } from 'app-development/test/mocks';
import { AddSubformCard } from './AddSubformCard';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('AddSubformCard', () => {
  it('should render AddSubformCard', () => {
    renderAddSubformCard();
    expect(screen.getByText(textMock('ux_editor.task_card_add_new_subform'))).toBeInTheDocument();
  });
});

const view = renderWithProviders();
const renderAddSubformCard = () => {
  return view(<AddSubformCard />);
};

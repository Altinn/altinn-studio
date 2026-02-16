import React from 'react';
import { screen } from '@testing-library/react';
import { ContactPointTableHeader } from './ContactPointTableHeader';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from 'dashboard/testing/mocks';

const headerLabelKeys = [
  'app_settings.about_tab_contact_point_fieldset_email_label',
  'app_settings.about_tab_contact_point_fieldset_telephone_label',
  'app_settings.about_tab_contact_point_fieldset_title_desc_label',
  'app_settings.about_tab_contact_point_fieldset_link_label',
] as const;

const renderHeader = () =>
  renderWithProviders(
    <table>
      <ContactPointTableHeader />
    </table>,
  );

describe('ContactPointTableHeader', () => {
  it('renders all column headers with correct labels', () => {
    renderHeader();
    headerLabelKeys.forEach((key) => {
      expect(screen.getByText(textMock(key))).toBeInTheDocument();
    });
    expect(screen.getByRole('cell', { name: textMock('general.edit') })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: textMock('general.delete') })).toBeInTheDocument();
  });
});

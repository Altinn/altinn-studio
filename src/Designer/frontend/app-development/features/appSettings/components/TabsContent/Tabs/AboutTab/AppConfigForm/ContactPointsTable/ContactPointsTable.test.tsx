import React, { useState } from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactPointsTable } from './ContactPointsTable';
import type { ContactPoint } from 'app-shared/types/AppConfig';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from 'dashboard/testing/mocks';

const mockContactPoints = [
  {
    email: 'test@example.com',
    category: 'Support',
    telephone: '123-456-7890',
    contactPage: 'https://example.com/contact',
  },
];

const newContact = {
  email: 'new@example.com',
  telephone: '99999999',
  contactPage: 'new-example.com',
  category: 'New support',
};

const fieldLabelKeys = {
  email: 'app_settings.about_tab_contact_point_fieldset_email_label',
  telephone: 'app_settings.about_tab_contact_point_fieldset_telephone_label',
  contactPage: 'app_settings.about_tab_contact_point_fieldset_contact_page_label',
  category: 'app_settings.about_tab_contact_point_fieldset_category_label',
} as const;

describe('ContactPointsTable', () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  it('renders existing contact points in the table', () => {
    renderContactPointsTable();
    expect(screen.getByText(mockContactPoints[0].email)).toBeInTheDocument();
    expect(screen.getByText(mockContactPoints[0].telephone)).toBeInTheDocument();
    expect(screen.getByText(mockContactPoints[0].category)).toBeInTheDocument();
  });

  it('adds a new contact point and calls onContactPointsChanged', async () => {
    const user = userEvent.setup();
    const onContactPointsChanged = jest.fn();
    renderContactPointsTable({ contactPointList: [], onContactPointsChanged });
    await user.click(
      screen.getByRole('button', {
        name: textMock('app_settings.about_tab_contact_point_add_button_text'),
      }),
    );
    await user.type(screen.getByLabelText(textMock(fieldLabelKeys.email)), newContact.email);
    await user.type(
      screen.getByLabelText(textMock(fieldLabelKeys.telephone)),
      newContact.telephone,
    );
    await user.type(
      screen.getByLabelText(textMock(fieldLabelKeys.contactPage)),
      newContact.contactPage,
    );
    await user.type(screen.getByLabelText(textMock(fieldLabelKeys.category)), newContact.category);
    await user.click(screen.getByRole('button', { name: textMock('general.save') }));
    expect(onContactPointsChanged).toHaveBeenCalledTimes(1);
    const updatedList = onContactPointsChanged.mock.calls[0][0] as typeof mockContactPoints;
    expect(updatedList).toHaveLength(1);
    expect(updatedList[0]).toMatchObject(newContact);
    expect(screen.getByText(newContact.email)).toBeInTheDocument();
    expect(screen.getByText(newContact.telephone)).toBeInTheDocument();
    expect(screen.getByText(newContact.category)).toBeInTheDocument();
  });

  it('removes a contact point and calls onContactPointsChanged when delete is confirmed', async () => {
    const user = userEvent.setup();
    const onContactPointsChanged = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderContactPointsTable({ onContactPointsChanged });
    const dataRows = screen.getAllByRole('row');
    const row = dataRows[1];
    const buttons = within(row).getAllByRole('button');
    const deleteButton = buttons[buttons.length - 1];
    await user.click(deleteButton);
    expect(onContactPointsChanged).toHaveBeenCalledTimes(1);
    const updatedList = onContactPointsChanged.mock.calls[0][0] as typeof mockContactPoints;
    expect(updatedList).toHaveLength(0);
    confirmSpy.mockRestore();
  });

  it('focuses the add button when URL focus targets contact points', async () => {
    renderContactPointsTable({
      contactPointList: [],
      initialEntries: [
        '/editor/org/app/app-settings?currentTab=about&focus=contact-points-table-0',
      ],
    });
    const addButton = screen.getByRole('button', {
      name: textMock('app_settings.about_tab_contact_point_add_button_text'),
    });
    await waitFor(() => expect(addButton).toHaveFocus());
    expect(addButton.className).toContain('validationFocusedButton');
  });

  it('does not focus add button for unrelated URL focus target', async () => {
    renderContactPointsTable({
      contactPointList: [],
      initialEntries: ['/editor/org/app/app-settings?currentTab=about&focus=title-nb'],
    });
    const addButton = screen.getByRole('button', {
      name: textMock('app_settings.about_tab_contact_point_add_button_text'),
    });
    await waitFor(() => expect(addButton).not.toHaveFocus());
    expect(addButton.className).not.toContain('validationFocusedButton');
  });

  it('removes validation focus class when focus moves away from add button', async () => {
    const user = userEvent.setup();
    renderContactPointsTable({
      contactPointList: [],
      initialEntries: [
        '/editor/org/app/app-settings?currentTab=about&focus=contact-points-table-0',
      ],
    });
    const addButton = screen.getByRole('button', {
      name: textMock('app_settings.about_tab_contact_point_add_button_text'),
    });
    await waitFor(() => expect(addButton.className).toContain('validationFocusedButton'));
    await user.click(addButton);
    await waitFor(async () => {
      addButton.blur();
    });
    await waitFor(() => {
      expect(addButton.className).not.toContain('validationFocusedButton');
    });
  });
});

type RenderOptions = {
  contactPointList?: ContactPoint[];
  onContactPointsChanged?: (contactPoints: ContactPoint[]) => void;
  initialEntries?: string[];
};

const renderContactPointsTable = (options?: RenderOptions) => {
  const Wrapper = () => {
    const [contactPoints, setContactPoints] = useState<ContactPoint[]>(
      options?.contactPointList ?? mockContactPoints,
    );

    const handleContactPointsChanged = (updated: ContactPoint[]) => {
      setContactPoints(updated);
      options?.onContactPointsChanged?.(updated);
    };

    return (
      <ContactPointsTable
        contactPointList={contactPoints}
        onContactPointsChanged={handleContactPointsChanged}
        id='contact-points-table'
      />
    );
  };

  return renderWithProviders(<Wrapper />, { initialEntries: options?.initialEntries });
};

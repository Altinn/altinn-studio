import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactPointTableRow, type ContactPointTableRowProps } from './ContactPointTableRow';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from 'dashboard/testing/mocks';

const email = 'user@example.com';
const telephone = '12345678';
const category = 'Support';
const contactPage = 'example.com';

describe('ContactPointTableRow', () => {
  it('renders contact point values and hides link button when contactPage is invalid', () => {
    renderContactPointTableRow({
      contactPoint: {
        email,
        telephone,
        category,
        contactPage: 'not a valid url',
      },
    });
    expect(screen.getByText(email)).toBeInTheDocument();
    expect(screen.getByText(telephone)).toBeInTheDocument();
    expect(screen.getByText(category)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: textMock('app_settings.about_tab_contact_point_table_link_open'),
      }),
    ).not.toBeInTheDocument();
  });

  it('shows link button when contactPage is valid and calls onLinkClick with contactPage', async () => {
    const user = userEvent.setup();
    const onLinkClick = jest.fn();
    renderContactPointTableRow({
      contactPoint: {
        email: '',
        telephone: '',
        category: '',
        contactPage,
      },
      onLinkClick,
    });
    const linkButton = screen.getByRole('button', {
      name: textMock('app_settings.about_tab_contact_point_table_link_open'),
    });
    await user.click(linkButton);
    expect(onLinkClick).toHaveBeenCalledTimes(1);
    expect(onLinkClick).toHaveBeenCalledWith(contactPage);
  });

  it('calls onEdit and onRemove with the row index when their buttons are clicked', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    const onRemove = jest.fn();
    const index = 2;
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderContactPointTableRow({
      index,
      onEdit,
      onRemove,
      contactPoint: {
        email: email,
        telephone: telephone,
        category: category,
        contactPage: '',
      },
    });
    const row = screen.getByRole('row');
    const buttons = within(row).getAllByRole('button');
    const [editButton, deleteButton] = buttons;
    await user.click(editButton);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(index);
    await user.click(deleteButton);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(index);
    confirmSpy.mockRestore();
  });
});

const defaultProps: ContactPointTableRowProps = {
  contactPoint: {
    email: '',
    telephone: '',
    category: '',
    contactPage: '',
  },
  index: 0,
  onEdit: jest.fn(),
  onRemove: jest.fn(),
  onLinkClick: jest.fn(),
};

function renderContactPointTableRow(props: Partial<ContactPointTableRowProps> = {}) {
  return renderWithProviders(
    <table>
      <tbody>
        <ContactPointTableRow {...defaultProps} {...props} />
      </tbody>
    </table>,
  );
}

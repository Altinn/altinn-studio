import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactPointTableRow, type ContactPointTableRowProps } from './ContactPointTableRow';
import { renderWithProviders } from 'dashboard/testing/mocks';

const email = 'user@example.com';
const telephone = '12345678';
const category = 'Support';
const contactPage = 'whatever the user typed';

describe('ContactPointTableRow', () => {
  it('renders contact point values including contactPage as plain text', () => {
    renderContactPointTableRow({
      contactPoint: {
        email,
        telephone,
        category,
        contactPage,
      },
    });
    expect(screen.getByText(email)).toBeInTheDocument();
    expect(screen.getByText(telephone)).toBeInTheDocument();
    expect(screen.getByText(category)).toBeInTheDocument();
    expect(screen.getByText(contactPage)).toBeInTheDocument();
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
        email,
        telephone,
        category,
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

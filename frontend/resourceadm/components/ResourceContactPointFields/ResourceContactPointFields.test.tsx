import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { ResourceContactPointFieldsProps } from './ResourceContactPointFields';
import { ResourceContactPointFields } from './ResourceContactPointFields';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ResourceContactPoint } from 'app-shared/types/ResourceAdm';

const mockContactPoint1: ResourceContactPoint = {
  email: 'test',
  category: 'test',
  telephone: 'test',
  contactPage: 'test',
};
const mockContactPoint2: ResourceContactPoint = {
  email: '',
  category: '',
  telephone: '',
  contactPage: '',
};
const mockContactPointList: ResourceContactPoint[] = [mockContactPoint1];
const mockNewInput: string = '123';

describe('ResourceContactPointFields', () => {
  const mockOnContactPointsChanged = jest.fn();

  const defaultProps: ResourceContactPointFieldsProps = {
    contactPointList: mockContactPointList,
    onContactPointsChanged: mockOnContactPointsChanged,
    errors: [],
  };

  it('handles undefined contact point list correctly', () => {
    render(<ResourceContactPointFields {...defaultProps} contactPointList={undefined} />);

    const categoryLabel = screen.getByLabelText(
      textMock('resourceadm.about_resource_contact_label_category'),
      { exact: false, selector: 'input' },
    );
    const emailLabel = screen.getByLabelText(
      textMock('resourceadm.about_resource_contact_label_email'),
    );
    const telephoneLabel = screen.getByLabelText(
      textMock('resourceadm.about_resource_contact_label_telephone'),
    );
    const contactPageLabel = screen.getByLabelText(
      textMock('resourceadm.about_resource_contact_label_contactpage'),
    );

    expect(categoryLabel).toHaveValue('');
    expect(emailLabel).toHaveValue('');
    expect(telephoneLabel).toHaveValue('');
    expect(contactPageLabel).toHaveValue('');
  });

  it('handles category input change', async () => {
    const user = userEvent.setup();
    render(<ResourceContactPointFields {...defaultProps} />);

    const categoryLabel = screen.getByLabelText(
      textMock('resourceadm.about_resource_contact_label_category'),
      { exact: false, selector: 'input' },
    );
    expect(categoryLabel).toHaveValue(mockContactPoint1.category);

    await user.type(categoryLabel, mockNewInput);

    expect(
      screen.getByLabelText(textMock('resourceadm.about_resource_contact_label_category'), {
        exact: false,
        selector: 'input',
      }),
    ).toHaveValue(`${mockContactPoint1.category}${mockNewInput}`);
  });

  it('handles email input change', async () => {
    const user = userEvent.setup();
    render(<ResourceContactPointFields {...defaultProps} />);

    const emailLabel = screen.getByLabelText(
      textMock('resourceadm.about_resource_contact_label_email'),
    );
    expect(emailLabel).toHaveValue(mockContactPoint1.email);

    await user.type(emailLabel, mockNewInput);

    expect(
      screen.getByLabelText(textMock('resourceadm.about_resource_contact_label_email')),
    ).toHaveValue(`${mockContactPoint1.email}${mockNewInput}`);
  });

  it('handles telephone input change', async () => {
    const user = userEvent.setup();
    render(<ResourceContactPointFields {...defaultProps} />);

    const telephoneLabel = screen.getByLabelText(
      textMock('resourceadm.about_resource_contact_label_telephone'),
    );
    expect(telephoneLabel).toHaveValue(mockContactPoint1.telephone);

    await user.type(telephoneLabel, mockNewInput);

    expect(
      screen.getByLabelText(textMock('resourceadm.about_resource_contact_label_telephone')),
    ).toHaveValue(`${mockContactPoint1.telephone}${mockNewInput}`);
  });

  it('handles category input change', async () => {
    const user = userEvent.setup();
    render(<ResourceContactPointFields {...defaultProps} />);

    const contactpageLabel = screen.getByLabelText(
      textMock('resourceadm.about_resource_contact_label_contactpage'),
    );
    expect(contactpageLabel).toHaveValue(mockContactPoint1.contactPage);

    await user.type(contactpageLabel, mockNewInput);

    expect(
      screen.getByLabelText(textMock('resourceadm.about_resource_contact_label_contactpage')),
    ).toHaveValue(`${mockContactPoint1.contactPage}${mockNewInput}`);
  });

  it('adds a new contact point when clicking the "Add Contact Point" button', async () => {
    const user = userEvent.setup();
    render(<ResourceContactPointFields {...defaultProps} />);

    const addButton = screen.getByText(textMock('resourceadm.about_resource_contact_add_button'));
    await user.click(addButton);

    const newContactPointField = screen.getByText(
      textMock('resourceadm.about_resource_contact_legend', { index: 2 }),
    );
    expect(newContactPointField).toBeInTheDocument();
    expect(mockOnContactPointsChanged).toHaveBeenCalledWith([
      mockContactPoint1,
      {
        telephone: '',
        category: '',
        contactPage: '',
        email: '',
      },
    ]);
  });

  it('should delete contact point when clicking the "Delete contact point" button', async () => {
    const user = userEvent.setup();
    render(
      <ResourceContactPointFields
        {...defaultProps}
        contactPointList={[mockContactPoint1, mockContactPoint2]}
      />,
    );

    const removeButton = screen.getAllByText(
      textMock('resourceadm.about_resource_contact_remove_button'),
    );
    await user.click(removeButton[0]);

    const confirmRemoveButton = screen.getByText(
      textMock('resourceadm.about_resource_contact_confirm_remove_button'),
    );
    await user.click(confirmRemoveButton);

    const contactPointField = screen.queryByText(
      textMock('resourceadm.about_resource_contact_legend', { index: 2 }),
    );
    expect(contactPointField).not.toBeInTheDocument();
  });

  it('should edit contact point when input field value is changed', async () => {
    const user = userEvent.setup();
    render(<ResourceContactPointFields {...defaultProps} />);

    const categoryLabel = screen.getByLabelText(
      textMock('resourceadm.about_resource_contact_label_category'),
      { exact: false, selector: 'input' },
    );
    const emailLabel = screen.getByLabelText(
      textMock('resourceadm.about_resource_contact_label_email'),
    );
    const telephoneLabel = screen.getByLabelText(
      textMock('resourceadm.about_resource_contact_label_telephone'),
    );
    const contactPageLabel = screen.getByLabelText(
      textMock('resourceadm.about_resource_contact_label_contactpage'),
    );

    await user.type(categoryLabel, mockNewInput);
    await waitFor(() => categoryLabel.blur());
    await user.type(emailLabel, mockNewInput);
    await waitFor(() => emailLabel.blur());
    await user.type(telephoneLabel, mockNewInput);
    await waitFor(() => telephoneLabel.blur());
    await user.type(contactPageLabel, mockNewInput);
    await waitFor(() => contactPageLabel.blur());

    expect(mockOnContactPointsChanged).toHaveBeenCalledWith([
      {
        ...mockContactPoint1,
        category: `${mockContactPoint1.contactPage}${mockNewInput}`,
        email: `${mockContactPoint1.contactPage}${mockNewInput}`,
        telephone: `${mockContactPoint1.contactPage}${mockNewInput}`,
        contactPage: `${mockContactPoint1.contactPage}${mockNewInput}`,
      },
    ]);
  });

  it('displays error message when field has error message', () => {
    render(
      <ResourceContactPointFields
        {...defaultProps}
        errors={[
          {
            field: 'contactPoints',
            index: 0,
            error: textMock('resourceadm.about_resource_contact_point_error'),
          },
        ]}
        contactPointList={[mockContactPoint2]}
      />,
    );

    const contactPointError = screen.getByText(
      textMock('resourceadm.about_resource_contact_point_error'),
    );

    expect(contactPointError).toBeInTheDocument();
  });

  it('does not display error message when show error is false', () => {
    render(<ResourceContactPointFields {...defaultProps} />);

    const contactPointError = screen.queryByText(
      textMock('resourceadm.about_resource_contact_point_error'),
    );

    expect(contactPointError).not.toBeInTheDocument();
  });
});

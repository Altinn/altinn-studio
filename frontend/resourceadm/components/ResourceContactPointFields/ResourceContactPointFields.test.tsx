import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ResourceContactPointFieldsProps } from './ResourceContactPointFields';
import { ResourceContactPointFields } from './ResourceContactPointFields';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
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
    onFocus: jest.fn(),
    showErrors: false,
  };

  it('handles undefined contact point list correctly', () => {
    render(<ResourceContactPointFields {...defaultProps} contactPointList={undefined} />);

    const categoryLabel = screen.getByLabelText(
      textMock('resourceadm.about_resource_contact_label_category'),
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
    );
    expect(categoryLabel).toHaveValue(mockContactPoint1.category);

    await act(() => user.type(categoryLabel, mockNewInput));

    expect(
      screen.getByLabelText(textMock('resourceadm.about_resource_contact_label_category')),
    ).toHaveValue(`${mockContactPoint1.category}${mockNewInput}`);
  });

  it('handles email input change', async () => {
    const user = userEvent.setup();
    render(<ResourceContactPointFields {...defaultProps} />);

    const emailLabel = screen.getByLabelText(
      textMock('resourceadm.about_resource_contact_label_email'),
    );
    expect(emailLabel).toHaveValue(mockContactPoint1.email);

    await act(() => user.type(emailLabel, mockNewInput));

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

    await act(() => user.type(telephoneLabel, mockNewInput));

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

    await act(() => user.type(contactpageLabel, mockNewInput));

    expect(
      screen.getByLabelText(textMock('resourceadm.about_resource_contact_label_contactpage')),
    ).toHaveValue(`${mockContactPoint1.contactPage}${mockNewInput}`);
  });

  it('adds a new contact point when clicking the "Add Contact Point" button', async () => {
    const user = userEvent.setup();
    render(<ResourceContactPointFields {...defaultProps} />);

    const addButton = screen.getByText(textMock('resourceadm.about_resource_contact_add_button'));
    await act(() => user.click(addButton));

    const contactPointFields = screen.getAllByText(
      textMock('resourceadm.about_resource_contact_legend'),
    );
    expect(contactPointFields).toHaveLength(mockContactPointList.length + 1);
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
    await act(() => user.click(removeButton[0]));

    const confirmRemoveButton = screen.getByText(
      textMock('resourceadm.about_resource_contact_confirm_remove_button'),
    );
    await act(() => user.click(confirmRemoveButton));

    const contactPointFields = screen.getAllByText(
      textMock('resourceadm.about_resource_contact_legend'),
    );
    expect(contactPointFields).toHaveLength(1);
  });

  it('should edit contact point when input field value is changed', async () => {
    const user = userEvent.setup();
    render(<ResourceContactPointFields {...defaultProps} />);

    const telephoneField = screen.getByLabelText(
      textMock('resourceadm.about_resource_contact_label_telephone'),
    );

    await act(() => user.type(telephoneField, mockNewInput));
    await act(() => telephoneField.blur());

    expect(mockOnContactPointsChanged).toHaveBeenCalledWith([
      {
        ...mockContactPoint1,
        telephone: `${mockContactPoint1.contactPage}${mockNewInput}`,
      },
    ]);
  });

  it('displays error message when show error is true', () => {
    render(
      <ResourceContactPointFields
        {...defaultProps}
        showErrors
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

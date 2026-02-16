import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactPointDialog, type ContactPointDialogProps } from './ContactPointDialog';
import { ContactPointField } from 'app-shared/types/AppConfig';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from 'dashboard/testing/mocks';

const contactPointFieldTestConfig: {
  field: ContactPointField;
  labelKey: string;
  descriptionKey?: string;
}[] = [
  {
    field: ContactPointField.Email,
    labelKey: 'app_settings.about_tab_contact_point_fieldset_email_label',
  },
  {
    field: ContactPointField.Telephone,
    labelKey: 'app_settings.about_tab_contact_point_fieldset_telephone_label',
  },
  {
    field: ContactPointField.ContactPage,
    labelKey: 'app_settings.about_tab_contact_point_fieldset_contact_page_label',
  },
  {
    field: ContactPointField.Category,
    labelKey: 'app_settings.about_tab_contact_point_fieldset_category_label',
    descriptionKey: 'app_settings.about_tab_contact_point_fieldset_category_description',
  },
];

describe('ContactPointDialog', () => {
  it('renders all contact point fields and category description', () => {
    renderContactPointDialog();
    contactPointFieldTestConfig.forEach(({ labelKey }) => {
      expect(screen.getByLabelText(textMock(labelKey))).toBeInTheDocument();
    });
    contactPointFieldTestConfig
      .filter(({ descriptionKey }) => descriptionKey)
      .forEach(({ descriptionKey }) => {
        expect(screen.getByText(textMock(descriptionKey!))).toBeInTheDocument();
      });
  });

  it('calls onFieldChange for each field when the user types', async () => {
    const user = userEvent.setup();
    const changeHandler = jest.fn();
    const onFieldChange = jest.fn().mockReturnValue(changeHandler);
    renderContactPointDialog({ onFieldChange });
    for (const { field, labelKey } of contactPointFieldTestConfig) {
      changeHandler.mockReset();
      const input = screen.getByLabelText(textMock(labelKey));
      await user.type(input, 'test');
      expect(onFieldChange).toHaveBeenCalledWith(field);
      expect(changeHandler).toHaveBeenCalled();
    }
  });

  it('calls onSave and onClose when actions are clicked', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const onClose = jest.fn();
    renderContactPointDialog({ onSave, onClose });
    await user.click(screen.getByRole('button', { name: textMock('general.save'), hidden: true }));
    expect(onSave).toHaveBeenCalledTimes(1);
    await user.click(
      screen.getByRole('button', { name: textMock('general.cancel'), hidden: true }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

const defaultProps: ContactPointDialogProps = {
  dialogRef: { current: null },
  draftContactPoint: {
    email: '',
    telephone: '',
    contactPage: '',
    category: '',
  },
  onFieldChange: jest.fn(),
  onSave: jest.fn(),
  onClose: jest.fn(),
};

const renderContactPointDialog = (props: Partial<ContactPointDialogProps> = {}) => {
  renderWithProviders(<ContactPointDialog {...defaultProps} {...props} />);
};

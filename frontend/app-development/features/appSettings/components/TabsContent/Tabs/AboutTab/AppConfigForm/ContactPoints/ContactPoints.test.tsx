import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ContactPoints } from './ContactPoints';
import type { ContactPointsProps } from './ContactPoints';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ContactPoint } from 'app-shared/types/AppConfig';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';

describe('ContactPoints', () => {
  afterEach(jest.clearAllMocks);

  it('renders a single contact point card by default if list is empty', () => {
    renderComponent({ contactPointList: [] });
    expect(
      getText(textMock('app_settings.about_tab_contact_point_fieldset_legend', { index: 1 })),
    ).toBeInTheDocument();
  });

  it('renders multiple contact point cards if list has items', () => {
    renderComponent({ contactPointList: [contactPoint1, contactPoint2] });
    expect(
      getText(textMock('app_settings.about_tab_contact_point_fieldset_legend', { index: 1 })),
    ).toBeInTheDocument();
    expect(
      getText(textMock('app_settings.about_tab_contact_point_fieldset_legend', { index: 2 })),
    ).toBeInTheDocument();
  });

  it('adds a new contact point when add button is clicked', async () => {
    const onContactPointsChanged = jest.fn();
    renderComponent({ contactPointList: [], onContactPointsChanged });

    const user = userEvent.setup();
    await user.click(getButton(textMock('app_settings.about_tab_contact_point_add_button_text')));

    expect(onContactPointsChanged).toHaveBeenCalledWith([
      { category: '', email: '', telephone: '', contactPage: '' },
      { category: '', email: '', telephone: '', contactPage: '' },
    ]);
  });

  it('removes a contact point when delete button is clicked', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const onContactPointsChanged = jest.fn();

    renderComponent({ contactPointList: [contactPoint1, contactPoint2], onContactPointsChanged });

    const user = userEvent.setup();

    const deleteButton1 = getButton(
      textMock('app_settings.about_tab_contact_point_delete_button_text', { index: 0 }),
    );
    const deleteButton2 = getButton(
      textMock('app_settings.about_tab_contact_point_delete_button_text', { index: 1 }),
    );
    expect(deleteButton1).toBeInTheDocument();
    expect(deleteButton2).toBeInTheDocument();

    await user.click(deleteButton1);
    expect(onContactPointsChanged).toHaveBeenCalledWith([contactPoint2]);

    expect(deleteButton1).not.toBeInTheDocument();
    expect(deleteButton2).not.toBeInTheDocument();
  });

  it('calls onContactPointsChanged when a field is updated', async () => {
    const onContactPointsChanged = jest.fn();
    renderComponent({ contactPointList: [contactPoint1], onContactPointsChanged });

    const user = userEvent.setup();
    const textbox = getTextbox(
      textMock('app_settings.about_tab_contact_point_fieldset_category_label'),
    );

    await user.clear(textbox);

    const category: string = 'new';
    await user.type(textbox, category);

    expect(onContactPointsChanged).toHaveBeenCalledWith([
      {
        ...contactPoint1,
        category,
      },
    ]);
  });

  it('displays error message if provided', () => {
    renderComponent({ errors: [error] });
    expect(getText(error.error)).toBeInTheDocument();
  });
});

const contactPoint1: ContactPoint = {
  category: 'Support',
  email: 'support@example.com',
  telephone: '12345678',
  contactPage: 'https://example.com/1',
};

const contactPoint2: ContactPoint = {
  category: 'Sales',
  email: 'sales@example.com',
  telephone: '87654321',
  contactPage: 'https://example.com/2',
};

const errorMessage = textMock('app_settings.about_tab_error_contact_points');
const error: AppConfigFormError = {
  field: 'contactPoints',
  index: 0,
  error: errorMessage,
};

const defaultProps: ContactPointsProps = {
  contactPointList: [],
  errors: [],
  id: 'contact-points',
  onContactPointsChanged: jest.fn(),
};

function renderComponent(props: Partial<ContactPointsProps> = {}) {
  return render(<ContactPoints {...defaultProps} {...props} />);
}

const getText = (text: string): HTMLElement => screen.getByText(text);
const getTextbox = (label: string): HTMLInputElement => screen.getByLabelText(label);
const getButton = (name: string): HTMLButtonElement => screen.getByRole('button', { name });

import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ContactPointCard } from './ContactPointCard';
import type { ContactPointCardProps } from './ContactPointCard';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ContactPoint } from 'app-shared/types/AppConfig';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';

describe('ContactPointCard', () => {
  afterEach(jest.clearAllMocks);

  it('renders the fieldset legend with tag', () => {
    renderComponent();
    expect(
      getText(textMock('app_settings.about_tab_contact_point_fieldset_legend', { index: 1 })),
    ).toBeInTheDocument();
    expect(getText(textMock('general.required'))).toBeInTheDocument();
  });

  it('renders all four input fields with correct values', () => {
    renderComponent();
    expect(getTextbox(categoryLabel)).toHaveValue(defaultContactPoint.category);
    expect(getTextbox(emailLabel)).toHaveValue(defaultContactPoint.email);
    expect(getTextbox(telephoneLabel)).toHaveValue(defaultContactPoint.telephone);
    expect(getTextbox(contactPageLabel)).toHaveValue(defaultContactPoint.contactPage);
  });

  it('calls onContactPointsChanged when category is changed', async () => {
    const onContactPointsChanged = jest.fn();
    renderComponent({ onContactPointsChanged });
    const user = userEvent.setup();

    const textbox = getTextbox(categoryLabel);
    await user.clear(textbox);

    const category: string = 'a';
    await user.type(textbox, category);

    expect(onContactPointsChanged).toHaveBeenCalledWith({
      ...defaultContactPoint,
      category,
    });
  });

  it('calls onContactPointsChanged when email is changed', async () => {
    const onContactPointsChanged = jest.fn();
    renderComponent({ onContactPointsChanged });
    const user = userEvent.setup();

    const textbox = getTextbox(emailLabel);
    await user.clear(textbox);

    const email: string = 'a';
    await user.type(textbox, email);

    expect(onContactPointsChanged).toHaveBeenCalledWith({
      ...defaultContactPoint,
      email,
    });
  });

  it('calls onContactPointsChanged when telephone is changed', async () => {
    const onContactPointsChanged = jest.fn();
    renderComponent({ onContactPointsChanged });
    const user = userEvent.setup();

    const textbox = getTextbox(telephoneLabel);
    await user.clear(textbox);

    const telephone: string = '1';
    await user.type(textbox, telephone);

    expect(onContactPointsChanged).toHaveBeenCalledWith({
      ...defaultContactPoint,
      telephone,
    });
  });

  it('calls onContactPointsChanged when contactPage is changed', async () => {
    const onContactPointsChanged = jest.fn();
    renderComponent({ onContactPointsChanged });
    const user = userEvent.setup();

    const textbox = getTextbox(contactPageLabel);
    await user.clear(textbox);

    const contactPage: string = 'a';
    await user.type(textbox, contactPage);

    expect(onContactPointsChanged).toHaveBeenCalledWith({
      ...defaultContactPoint,
      contactPage,
    });
  });

  it('calls onRemoveButtonClick when delete button is clicked', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const onRemoveButtonClick = jest.fn();
    renderComponent({ onRemoveButtonClick });
    const user = userEvent.setup();

    const deleteButton = getButton(
      textMock('app_settings.about_tab_contact_point_delete_button_text', { index: 1 }),
    );
    await user.click(deleteButton);

    expect(onRemoveButtonClick).toHaveBeenCalled();
  });

  it('renders error message if error exists for the correct index', () => {
    renderComponent({ errors });
    expect(getText(errorMessage)).toBeInTheDocument();
  });

  it('does not render error message if no error matches the index', () => {
    renderComponent({ errors: [{ ...error, index: 1 }] });
    expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
  });
});

const defaultContactPoint: ContactPoint = {
  category: '',
  email: '',
  telephone: '',
  contactPage: '',
};

const defaultProps: ContactPointCardProps = {
  contactPoint: defaultContactPoint,
  onContactPointsChanged: jest.fn(),
  errors: [],
  index: 0,
  id: 'contact-point-0',
  onRemoveButtonClick: jest.fn(),
};

function renderComponent(props: Partial<ContactPointCardProps> = {}) {
  return render(<ContactPointCard {...defaultProps} {...props} />);
}

const getText = (text: string): HTMLElement =>
  screen.getByText((content) => content.includes(text));
const getTextbox = (label: string): HTMLInputElement => screen.getByLabelText(label);
const getButton = (label: string): HTMLButtonElement => screen.getByRole('button', { name: label });

const categoryLabel = textMock('app_settings.about_tab_contact_point_fieldset_category_label');
const emailLabel = textMock('app_settings.about_tab_contact_point_fieldset_email_label');
const telephoneLabel = textMock('app_settings.about_tab_contact_point_fieldset_telephone_label');
const contactPageLabel = textMock(
  'app_settings.about_tab_contact_point_fieldset_contact_page_label',
);
const errorMessage = textMock('app_settings.about_tab_error_contact_points');

const error: AppConfigFormError = {
  field: 'contactPoints',
  index: 0,
  error: errorMessage,
};

const errors: AppConfigFormError[] = [error];

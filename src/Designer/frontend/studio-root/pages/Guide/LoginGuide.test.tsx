import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { LoginGuide } from './LoginGuide';

const originalLocation = window.location;

describe('LoginGuide', () => {
  const defaultProps = {};

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    });
  });

  afterEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('should show first question initially', () => {
    renderLoginGuide();

    expect(screen.getByText(textMock('login_guide.q1_title'))).toBeInTheDocument();
  });

  it('should show second question only when first answer is Ja', async () => {
    const user = userEvent.setup();
    renderLoginGuide();

    await user.click(getFirstJaRadio());

    expect(screen.getByText(textMock('login_guide.q2_title'))).toBeInTheDocument();
  });

  it('should not show second question when first answer is Nei', async () => {
    const user = userEvent.setup();
    renderLoginGuide();

    await user.click(getFirstNeiRadio());

    expect(screen.queryByText(textMock('login_guide.q2_title'))).not.toBeInTheDocument();
  });

  it('should show new account button when user has no account', async () => {
    const user = userEvent.setup();
    renderLoginGuide();

    await user.click(getFirstNeiRadio());

    expect(
      screen.getByRole('button', { name: textMock('login_guide.new_account_button') }),
    ).toBeInTheDocument();
  });

  it('should show success message when user has account and used BankID', async () => {
    const user = userEvent.setup();
    renderLoginGuide();

    await user.click(getFirstJaRadio());
    await user.click(getSecondJaRadio());

    expect(
      screen.getByText(textMock('login_guide.direct_login_success_title'), { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('login_guide.direct_login_button') }),
    ).toBeInTheDocument();
  });

  it('should show account link warning when user has account but not used BankID', async () => {
    const user = userEvent.setup();
    renderLoginGuide({ accountLinkUrl: 'https://example.com/link' });

    await user.click(getFirstJaRadio());
    await user.click(getSecondNeiRadio());

    expect(
      screen.getByText(textMock('login_guide.account_link_danger_title'), { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('login_guide.account_link_button') }),
    ).toBeInTheDocument();
  });

  it('should store skip preference in localStorage when checkbox is checked', async () => {
    const user = userEvent.setup();
    renderLoginGuide();

    await user.click(getFirstJaRadio());
    await user.click(getSecondJaRadio());

    await user.click(screen.getByRole('checkbox', { name: textMock('login_guide.skip_checkbox') }));
    await user.click(
      screen.getByRole('button', { name: textMock('login_guide.direct_login_button') }),
    );

    expect(localStorage.getItem('altinn-studio-skip-login-guide')).toBe('true');
  });

  it('should redirect to /login when new account button is clicked', async () => {
    const user = userEvent.setup();
    renderLoginGuide();

    await user.click(getFirstNeiRadio());
    await user.click(
      screen.getByRole('button', { name: textMock('login_guide.new_account_button') }),
    );

    expect(window.location.href).toBe('/login');
  });

  it('should redirect to /login without storing skip when checkbox is not checked', async () => {
    const user = userEvent.setup();
    renderLoginGuide();

    await user.click(getFirstJaRadio());
    await user.click(getSecondJaRadio());
    await user.click(
      screen.getByRole('button', { name: textMock('login_guide.direct_login_button') }),
    );

    expect(window.location.href).toBe('/login');
    expect(localStorage.getItem('altinn-studio-skip-login-guide')).toBeNull();
  });

  it('should redirect to accountLinkUrl when account link button is clicked', async () => {
    const user = userEvent.setup();
    renderLoginGuide({ accountLinkUrl: 'https://example.com/link' });

    await user.click(getFirstJaRadio());
    await user.click(getSecondNeiRadio());
    await user.click(
      screen.getByRole('button', { name: textMock('login_guide.account_link_button') }),
    );

    expect(window.location.href).toBe('https://example.com/link');
  });

  const getFirstJaRadio = () =>
    screen.getAllByRole('radio', { name: textMock('login_guide.radio_yes') })[0];

  const getFirstNeiRadio = () =>
    screen.getAllByRole('radio', { name: textMock('login_guide.radio_no') })[0];

  const getSecondJaRadio = () =>
    screen.getAllByRole('radio', { name: textMock('login_guide.radio_yes') })[1];

  const getSecondNeiRadio = () =>
    screen.getAllByRole('radio', { name: textMock('login_guide.radio_no') })[1];

  const renderLoginGuide = (
    props: Partial<typeof defaultProps & { accountLinkUrl: string }> = {},
  ) => render(<LoginGuide {...defaultProps} {...props} />);
});

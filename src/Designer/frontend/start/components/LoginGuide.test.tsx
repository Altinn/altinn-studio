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
    window.location = originalLocation;
  });

  it('should show first question initially', () => {
    renderLoginGuide();

    expect(screen.getByText(textMock('login_guide.q1_title'))).toBeInTheDocument();
  });

  it('should show second question only when first answer is Ja', async () => {
    const user = userEvent.setup();
    renderLoginGuide();

    const jaRadios = screen.getAllByRole('radio', { name: textMock('login_guide.radio_yes') });
    await user.click(jaRadios[0]);

    expect(screen.getByText(textMock('login_guide.q2_title'))).toBeInTheDocument();
  });

  it('should not show second question when first answer is Nei', async () => {
    const user = userEvent.setup();
    renderLoginGuide();

    const neiRadios = screen.getAllByRole('radio', { name: textMock('login_guide.radio_no') });
    await user.click(neiRadios[0]);

    expect(screen.queryByText(textMock('login_guide.q2_title'))).not.toBeInTheDocument();
  });

  it('should show new account button when user has no account', async () => {
    const user = userEvent.setup();
    renderLoginGuide();

    const neiRadios = screen.getAllByRole('radio', { name: textMock('login_guide.radio_no') });
    await user.click(neiRadios[0]);

    expect(
      screen.getByRole('button', { name: textMock('login_guide.new_account_button') }),
    ).toBeInTheDocument();
  });

  it('should show success message when user has account and used BankID', async () => {
    const user = userEvent.setup();
    renderLoginGuide();

    await user.click(screen.getAllByRole('radio', { name: textMock('login_guide.radio_yes') })[0]);
    await user.click(screen.getAllByRole('radio', { name: textMock('login_guide.radio_yes') })[1]);

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

    await user.click(screen.getAllByRole('radio', { name: textMock('login_guide.radio_yes') })[0]);

    const neiRadios = screen.getAllByRole('radio', { name: textMock('login_guide.radio_no') });
    await user.click(neiRadios[1]);

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

    await user.click(screen.getAllByRole('radio', { name: textMock('login_guide.radio_yes') })[0]);
    await user.click(screen.getAllByRole('radio', { name: textMock('login_guide.radio_yes') })[1]);

    const checkbox = screen.getByRole('checkbox', {
      name: textMock('login_guide.skip_checkbox'),
    });
    await user.click(checkbox);
    await user.click(
      screen.getByRole('button', { name: textMock('login_guide.direct_login_button') }),
    );

    expect(localStorage.getItem('altinn-studio-skip-login-guide')).toBe('true');
  });

  const renderLoginGuide = (
    props: Partial<typeof defaultProps & { accountLinkUrl: string }> = {},
  ) => render(<LoginGuide {...defaultProps} {...props} />);
});

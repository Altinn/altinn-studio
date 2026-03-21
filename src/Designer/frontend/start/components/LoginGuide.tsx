import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import './LoginGuide.css';

const SKIP_GUIDE_KEY = 'altinn-studio-skip-login-guide';

type LoginGuideProps = {
  accountLinkUrl?: string;
};

export const LoginGuide = ({ accountLinkUrl }: LoginGuideProps): React.ReactElement => {
  const { t } = useTranslation();
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [hasUsedBankId, setHasUsedBankId] = useState<boolean | null>(null);
  const [skipNextTime, setSkipNextTime] = useState(false);

  const handleGoToLogin = () => {
    if (skipNextTime) {
      localStorage.setItem(SKIP_GUIDE_KEY, 'true');
    }
    window.location.href = '/login';
  };

  const handleAccountLinkClick = () => {
    if (accountLinkUrl) {
      window.location.href = accountLinkUrl;
    }
  };

  const handleHasAccountChange = (value: boolean) => {
    setHasAccount(value);
    if (!value) {
      setHasUsedBankId(null);
    }
  };

  const showResult = hasAccount !== null && (hasAccount === false || hasUsedBankId !== null);
  const showDirectLogin = hasAccount === true && hasUsedBankId === true;
  const showAccountLink = hasAccount === true && hasUsedBankId === false;
  const showNewAccount = hasAccount === false;

  return (
    <div className='login-guide'>
      <div className='login-guide-warning'>
        <strong>⚠ {t('login_guide.warning_title')}</strong>
        <p>{t('login_guide.warning_text')}</p>
      </div>

      <div className='login-guide-questions'>
        <fieldset className='login-guide-fieldset'>
          <legend className='login-guide-legend'>
            <strong>{t('login_guide.q1_title')}</strong>
            <span className='login-guide-hint'>{t('login_guide.q1_hint')}</span>
          </legend>
          <RadioGroup name='hasAccount' value={hasAccount} onChange={handleHasAccountChange} />
        </fieldset>

        {hasAccount && (
          <fieldset className='login-guide-fieldset'>
            <legend className='login-guide-legend'>
              <strong>{t('login_guide.q2_title')}</strong>
              <span className='login-guide-hint'>{t('login_guide.q2_hint')}</span>
            </legend>
            <RadioGroup name='hasUsedBankId' value={hasUsedBankId} onChange={setHasUsedBankId} />
          </fieldset>
        )}

        {showResult && (
          <div className='login-guide-result'>
            {showDirectLogin && (
              <>
                <div className='login-guide-alert login-guide-alert--success'>
                  <strong>✅ {t('login_guide.direct_login_success_title')}</strong>{' '}
                  {t('login_guide.direct_login_success_text')}
                </div>
                <label className='login-guide-checkbox'>
                  <input
                    type='checkbox'
                    checked={skipNextTime}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setSkipNextTime(e.target.checked)
                    }
                  />
                  {t('login_guide.skip_checkbox')}
                </label>
                <button className='login-guide-button' onClick={handleGoToLogin}>
                  {t('login_guide.direct_login_button')}
                </button>
              </>
            )}

            {showAccountLink && (
              <>
                <div className='login-guide-alert login-guide-alert--danger'>
                  <strong>🚫 {t('login_guide.account_link_danger_title')}</strong>
                  <p>
                    <Trans
                      i18nKey='login_guide.account_link_danger_text'
                      components={{ strong: <strong /> }}
                    />
                  </p>
                </div>
                <button
                  className='login-guide-button login-guide-button--outline'
                  onClick={handleAccountLinkClick}
                >
                  {t('login_guide.account_link_button')}
                </button>
              </>
            )}

            {showNewAccount && (
              <button className='login-guide-button' onClick={handleGoToLogin}>
                {t('login_guide.new_account_button')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const shouldSkipLoginGuide = (): boolean => {
  return localStorage.getItem(SKIP_GUIDE_KEY) === 'true';
};

type RadioGroupProps = {
  name: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
};

const RadioGroup = ({ name, value, onChange }: RadioGroupProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <div className='login-guide-radio-group'>
      <label className='login-guide-radio'>
        <input type='radio' name={name} checked={value === true} onChange={() => onChange(true)} />
        {t('login_guide.radio_yes')}
      </label>
      <label className='login-guide-radio'>
        <input
          type='radio'
          name={name}
          checked={value === false}
          onChange={() => onChange(false)}
        />
        {t('login_guide.radio_no')}
      </label>
    </div>
  );
};

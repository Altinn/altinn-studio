import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioButton,
  StudioCheckbox,
  StudioParagraph,
  StudioRadio,
  StudioRadioGroup,
} from '@studio/components';
import classes from './LoginGuide.module.css';

const SKIP_GUIDE_KEY = 'altinn-studio-skip-login-guide';

const HAS_ACCOUNT_GROUP_NAME = 'login-guide-has-account';
const HAS_USED_BANK_ID_GROUP_NAME = 'login-guide-has-used-bankid';

type LoginGuideProps = {
  accountLinkUrl?: string;
};

export const LoginGuide = ({ accountLinkUrl }: LoginGuideProps): React.ReactElement => {
  const { t } = useTranslation();
  const [hasAccount, setHasAccount] = useState<string | null>(null);
  const [hasUsedBankId, setHasUsedBankId] = useState<string | null>(null);
  const [skipNextTime, setSkipNextTime] = useState(false);

  const handleHasAccountChange = (value: string) => {
    setHasAccount(value);
    if (value === 'no') {
      setHasUsedBankId(null);
    }
  };

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

  const showResult = hasAccount !== null && (hasAccount === 'no' || hasUsedBankId !== null);
  const showDirectLogin = hasAccount === 'yes' && hasUsedBankId === 'yes';
  const showAccountLink = hasAccount === 'yes' && hasUsedBankId === 'no';
  const showNewAccount = hasAccount === 'no';

  return (
    <div className={classes.loginGuide}>
      <StudioAlert data-color='warning' className={classes.warning}>
        <StudioParagraph data-size='sm'>
          <strong>{t('login_guide.warning_title')}</strong>
        </StudioParagraph>
        <StudioParagraph data-size='sm'>{t('login_guide.warning_text')}</StudioParagraph>
      </StudioAlert>

      <div className={classes.questions}>
        <StudioRadioGroup legend={t('login_guide.q1_title')} description={t('login_guide.q1_hint')}>
          <StudioRadio
            label={t('login_guide.radio_yes')}
            name={HAS_ACCOUNT_GROUP_NAME}
            value='yes'
            checked={hasAccount === 'yes'}
            onChange={() => handleHasAccountChange('yes')}
          />
          <StudioRadio
            label={t('login_guide.radio_no')}
            name={HAS_ACCOUNT_GROUP_NAME}
            value='no'
            checked={hasAccount === 'no'}
            onChange={() => handleHasAccountChange('no')}
          />
        </StudioRadioGroup>

        {hasAccount === 'yes' && (
          <StudioRadioGroup
            legend={t('login_guide.q2_title')}
            description={t('login_guide.q2_hint')}
          >
            <StudioRadio
              label={t('login_guide.radio_yes')}
              name={HAS_USED_BANK_ID_GROUP_NAME}
              value='yes'
              checked={hasUsedBankId === 'yes'}
              onChange={() => setHasUsedBankId('yes')}
            />
            <StudioRadio
              label={t('login_guide.radio_no')}
              name={HAS_USED_BANK_ID_GROUP_NAME}
              value='no'
              checked={hasUsedBankId === 'no'}
              onChange={() => setHasUsedBankId('no')}
            />
          </StudioRadioGroup>
        )}

        {showResult && (
          <div className={classes.result}>
            {showDirectLogin && (
              <>
                <StudioAlert data-color='success'>
                  <StudioParagraph data-size='sm'>
                    <strong>{t('login_guide.direct_login_success_title')}</strong>{' '}
                    {t('login_guide.direct_login_success_text')}
                  </StudioParagraph>
                </StudioAlert>
                <StudioCheckbox
                  checked={skipNextTime}
                  onChange={(e) => setSkipNextTime(e.target.checked)}
                  value='skip'
                  label={t('login_guide.skip_checkbox')}
                />
                <StudioButton data-color='success' onClick={handleGoToLogin}>
                  {t('login_guide.direct_login_button')}
                </StudioButton>
              </>
            )}

            {showAccountLink && (
              <>
                <StudioAlert data-color='danger'>
                  <StudioParagraph data-size='sm'>
                    <strong>{t('login_guide.account_link_danger_title')}</strong>
                  </StudioParagraph>
                  <StudioParagraph data-size='sm'>
                    <Trans
                      i18nKey='login_guide.account_link_danger_text'
                      components={{ strong: <strong /> }}
                    />
                  </StudioParagraph>
                </StudioAlert>
                <StudioButton variant='secondary' onClick={handleAccountLinkClick}>
                  {t('login_guide.account_link_button')}
                </StudioButton>
              </>
            )}

            {showNewAccount && (
              <StudioButton data-color='success' onClick={handleGoToLogin}>
                {t('login_guide.new_account_button')}
              </StudioButton>
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

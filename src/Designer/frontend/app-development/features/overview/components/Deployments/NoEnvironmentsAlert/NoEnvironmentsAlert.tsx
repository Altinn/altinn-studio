import { Trans, useTranslation } from 'react-i18next';
import cn from 'classnames';
import type { StudioAlertProps } from '@studio/components';
import { StudioParagraph, StudioHeading, StudioAlert } from '@studio/components';
import { EmailContactProvider } from 'app-shared/getInTouch/providers';
import { GetInTouchWith } from 'app-shared/getInTouch';
import { altinnDocsUrl } from 'app-shared/ext-urls';

type NoEnvironmentsAlertProps = StudioAlertProps;
export const NoEnvironmentsAlert = ({ ...rest }: NoEnvironmentsAlertProps) => {
  const { t } = useTranslation();
  const contactByEmail = new GetInTouchWith(new EmailContactProvider());
  return (
    <StudioAlert {...rest} data-color='warning' className={cn(rest.className)}>
      <StudioHeading level={2} data-size='sm' spacing>
        {t('app_deployment.no_env_title')}
      </StudioHeading>
      <StudioParagraph spacing>
        <Trans i18nKey='app_deployment.no_env_1'>
          <a href={contactByEmail.url('serviceOwner')} />
        </Trans>
      </StudioParagraph>
      <StudioParagraph>
        <Trans i18nKey='app_deployment.no_env_2'>
          <a
            href={altinnDocsUrl({ relativeUrl: 'altinn-studio/v8/reference/testing/local/' })}
            target='_new'
            rel='noopener noreferrer'
          />
        </Trans>
      </StudioParagraph>
    </StudioAlert>
  );
};

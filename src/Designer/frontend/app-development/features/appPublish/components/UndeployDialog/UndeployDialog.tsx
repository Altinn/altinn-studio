import { useId, useState, type FormEvent, type ReactElement } from 'react';
import {
  StudioAlert,
  StudioButton,
  StudioDetails,
  StudioDialog,
  StudioHeading,
  StudioLink,
  StudioList,
  StudioParagraph,
  StudioTextfield,
} from '@designer/components';
import { Trans, useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { useUndeployMutation } from '../../../../hooks/mutations/useUndeployMutation';
import classes from './UndeployDialog.module.css';

export type UndeployDialogProps = {
  environment: string;
  envTitle: string;
  isOpen: boolean;
  onClose: () => void;
};

export const UndeployDialog = ({
  environment,
  envTitle,
  isOpen,
  onClose,
}: UndeployDialogProps): ReactElement => {
  const { t } = useTranslation();
  const headingId = useId();

  return (
    // The dialog sits in the environment's status alert, whose color it would otherwise take, such as red when failed.
    <StudioDialog open={isOpen} onClose={onClose} aria-labelledby={headingId} data-color='accent'>
      <StudioDialog.Block>
        <StudioHeading level={2} id={headingId}>
          {t('app_deployment.undeploy_dialog_title', { envTitle })}
        </StudioHeading>
      </StudioDialog.Block>
      {/* Mounted only while open, so that the dialog asks for the app name again each time. */}
      {isOpen && (
        <StudioDialog.Block className={classes.content}>
          <Consequences />
          <UndeployForm environment={environment} onClose={onClose} />
        </StudioDialog.Block>
      )}
    </StudioDialog>
  );
};

const Consequences = (): ReactElement => {
  const { t } = useTranslation();
  const changeAccessUrl = altinnDocsUrl({
    relativeUrl: 'altinn-studio/v8/reference/logic/instantiation/',
  });

  return (
    <>
      <StudioParagraph>{t('app_deployment.undeploy_dialog_description')}</StudioParagraph>
      <StudioAlert data-color='warning'>
        <StudioHeading level={3} data-size='2xs' spacing>
          {t('app_deployment.unpublish_considerations_title')}
        </StudioHeading>
        <StudioList.Root data-size='sm'>
          <StudioList.Unordered>
            <StudioList.Item>
              {t('app_deployment.unpublish_considerations_active_instances')}
            </StudioList.Item>
            <StudioList.Item>
              {t('app_deployment.unpublish_considerations_storage_api')}
            </StudioList.Item>
          </StudioList.Unordered>
        </StudioList.Root>
      </StudioAlert>
      <StudioDetails>
        <StudioDetails.Summary>
          {t('app_deployment.unpublish_alternatives_title')}
        </StudioDetails.Summary>
        <StudioDetails.Content>
          <StudioList.Root data-size='sm'>
            <StudioList.Unordered>
              <StudioList.Item>
                {t('app_deployment.unpublish_alternatives_previous_version')}
              </StudioList.Item>
              <StudioList.Item>
                {t('app_deployment.unpublish_alternatives_make_unavailable')}
              </StudioList.Item>
              <StudioList.Item>
                <Trans
                  i18nKey='app_deployment.unpublish_alternatives_change_access'
                  components={{
                    a: (
                      <StudioLink target='_blank' rel='noopener noreferrer' href={changeAccessUrl}>
                        {' '}
                      </StudioLink>
                    ),
                  }}
                />
              </StudioList.Item>
              <StudioList.Item>
                {t('app_deployment.unpublish_alternatives_add_validation')}
              </StudioList.Item>
            </StudioList.Unordered>
          </StudioList.Root>
        </StudioDetails.Content>
      </StudioDetails>
    </>
  );
};

type UndeployFormProps = {
  environment: string;
  onClose: () => void;
};

const UndeployForm = ({ environment, onClose }: UndeployFormProps): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const [typedAppName, setTypedAppName] = useState('');
  const { mutate: undeploy, isPending, error } = useUndeployMutation(org, app);
  const isAppNameConfirmed = typedAppName.trim().toLowerCase() === app.toLowerCase();

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!isAppNameConfirmed || isPending) return;
    undeploy({ environment }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={onSubmit} className={classes.form}>
      <StudioTextfield
        label={t('app_deployment.undeploy_confirmation_input_label')}
        description={t('app_deployment.undeploy_confirmation_input_description', {
          appName: app,
        })}
        value={typedAppName}
        onChange={(event) => setTypedAppName(event.currentTarget.value)}
        autoComplete='off'
      />
      {error && (
        <StudioAlert data-color='danger'>
          <StudioParagraph>
            <Trans
              i18nKey='app_deployment.error_unknown.message'
              components={{ a: <StudioLink href='/info/contact'> </StudioLink> }}
            />
          </StudioParagraph>
        </StudioAlert>
      )}
      <div className={classes.buttons}>
        <StudioButton
          type='submit'
          data-color='danger'
          disabled={!isAppNameConfirmed}
          loading={isPending}
        >
          {t('app_deployment.undeploy_button')}
        </StudioButton>
        <StudioButton type='button' variant='secondary' onClick={onClose}>
          {t('general.cancel')}
        </StudioButton>
      </div>
    </form>
  );
};

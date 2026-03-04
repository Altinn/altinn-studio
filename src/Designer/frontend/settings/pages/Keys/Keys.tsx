import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioHeading,
  StudioSpinner,
  StudioTable,
  StudioError,
  StudioButton,
  StudioParagraph,
} from '@studio/components';
import { useUserKeysQuery } from '../hooks/queries/useUserKeysQuery';
import { useDeleteUserKeyMutation } from '../hooks/mutations/useDeleteUserKeyMutation';

export const Keys = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    data: userKeys,
    isPending: isUserKeysPending,
    isError: isUserKeysError,
  } = useUserKeysQuery({
    hideDefaultError: true,
  });
  const {
    mutate: deleteUserKey,
    isPending: pendingDeleteUserKey,
    variables: deletingUserKey,
  } = useDeleteUserKeyMutation();

  const renderContent = () => {
    if (isUserKeysPending) {
      return <StudioSpinner aria-hidden spinnerTitle={t('user.settings.keys.loading')} />;
    }

    if (isUserKeysError) {
      return <StudioError>{t('user.settings.keys.error')}</StudioError>;
    }

    if (userKeys?.length === 0) {
      return <StudioParagraph>{t('user.settings.keys.no_keys')}</StudioParagraph>;
    }

    return (
      <StudioTable>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.Cell>{t('user.settings.keys.key')}</StudioTable.Cell>
            <StudioTable.Cell></StudioTable.Cell>
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {userKeys?.map((userKey) => (
            <StudioTable.Row key={userKey}>
              <StudioTable.Cell>{userKey}</StudioTable.Cell>
              <StudioTable.Cell>
                <StudioButton
                  data-color='danger'
                  onClick={() => deleteUserKey(userKey)}
                  disabled={pendingDeleteUserKey && deletingUserKey === userKey}
                >
                  {t('user.settings.keys.delete')}
                </StudioButton>
              </StudioTable.Cell>
            </StudioTable.Row>
          ))}
        </StudioTable.Body>
      </StudioTable>
    );
  };

  return (
    <div>
      <div>
        <StudioHeading level={2} spacing>
          {t('user.settings.keys.keys')}
        </StudioHeading>
        {renderContent()}
      </div>
    </div>
  );
};

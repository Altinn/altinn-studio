import React from 'react';

import { Button } from '@app/form-component';
import { ArrowLeftIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import classes from 'src/components/presentation/BackNavigationButton.module.css';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { MessageBoxConfigEvaluator } from 'src/features/applicationMetadata/messageBoxConfig';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { useIsSubformPage, useNavigationParam } from 'src/hooks/navigation';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { useExitSubform } from 'src/hooks/useNavigatePage';
import { useIsAnyProcessing, useIsThisProcessing, useProcessingMutation } from 'src/hooks/useProcessingMutation';
import { getDialogIdFromDataValues, getMessageBoxUrl } from 'src/utils/urls/urlHelper';

export function BackNavigationButton(props: { className?: string }) {
  const { langAsString } = useLanguage();
  const isMobile = useIsMobile();
  const party = useSelectedParty();
  const mainPageKey = useNavigationParam('mainPageKey');
  const isSubform = useIsSubformPage();

  const exitSubform = useExitSubform();
  const performProcess = useProcessingMutation('exit-subform');
  const isExitingSubform = useIsThisProcessing('exit-subform');
  const isAnyProcessing = useIsAnyProcessing();

  const applicationMetadata = getApplicationMetadata();
  const dataValues = useInstanceDataQuery({ select: (instance) => instance.dataValues }).data;
  const dialogId = getDialogIdFromDataValues(dataValues);
  const messageBoxUrl = getMessageBoxUrl(party?.partyId, dialogId);
  const hiddenFromInbox = MessageBoxConfigEvaluator.isHiddenFromInbox(applicationMetadata.messageBoxConfig);
  const returnUrl = window.altinnAppGlobalData.returnUrl;

  if (isSubform) {
    return (
      <Button
        onClick={() => performProcess(exitSubform)}
        disabled={isAnyProcessing}
        isLoading={isExitingSubform}
        loadingLabel={langAsString('general.loading')}
        variant='tertiary'
        size='sm'
        className={cn(classes.button, props.className)}
      >
        {!isExitingSubform && (
          <ArrowLeftIcon
            fontSize='1rem'
            aria-hidden
          />
        )}
        <Lang
          id={isMobile ? 'navigation.main_form' : 'navigation.back_to_main_form'}
          params={[{ key: mainPageKey }]}
        />
      </Button>
    );
  }

  if (returnUrl) {
    return (
      <Button
        asChild
        variant='tertiary'
        size='sm'
        className={cn(classes.button, props.className)}
      >
        <a href={returnUrl}>
          <ArrowLeftIcon
            fontSize='1rem'
            aria-hidden
          />
          <Lang id='navigation.back' />
        </a>
      </Button>
    );
  }

  if (messageBoxUrl && !hiddenFromInbox) {
    return (
      <Button
        asChild
        variant='tertiary'
        size='sm'
        className={cn(classes.button, props.className)}
      >
        <a href={messageBoxUrl}>
          <ArrowLeftIcon
            fontSize='1rem'
            aria-hidden
          />
          <Lang id={isMobile ? 'navigation.inbox' : 'navigation.back_to_inbox'} />
        </a>
      </Button>
    );
  }

  return null;
}

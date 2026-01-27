import React from 'react';

import { ArrowLeftIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Button } from 'src/app-components/Button/Button';
import classes from 'src/components/presentation/BackNavigationButton.module.css';
import { useIsProcessing } from 'src/core/contexts/processingContext';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { useIsSubformPage, useNavigationParam } from 'src/hooks/navigation';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { getDialogIdFromDataValues, getMessageBoxUrl } from 'src/utils/urls/urlHelper';

export function BackNavigationButton(props: { className?: string }) {
  const isMobile = useIsMobile();
  const party = useSelectedParty();
  const mainPageKey = useNavigationParam('mainPageKey');
  const isSubform = useIsSubformPage();

  const { exitSubform } = useNavigatePage();
  const { performProcess, isAnyProcessing, isThisProcessing: isExitingSubform } = useIsProcessing();

  const dataValues = useInstanceDataQuery({ select: (instance) => instance.dataValues }).data;
  const dialogId = getDialogIdFromDataValues(dataValues);
  const messageBoxUrl = getMessageBoxUrl(party?.partyId, dialogId);
  const returnUrl = window.altinnAppGlobalData.returnUrl;

  if (isSubform) {
    return (
      <Button
        onClick={() => performProcess(exitSubform)}
        disabled={isAnyProcessing}
        isLoading={isExitingSubform}
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

  if (messageBoxUrl) {
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

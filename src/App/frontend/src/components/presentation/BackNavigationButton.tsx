import React from 'react';

import { ArrowLeftIcon } from '@navikt/aksel-icons';
import { skipToken, useQuery } from '@tanstack/react-query';
import cn from 'classnames';

import { Button } from 'src/app-components/Button/Button';
import { Spinner } from 'src/app-components/loading/Spinner/Spinner';
import classes from 'src/components/presentation/BackNavigationButton.module.css';
import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { useIsProcessing } from 'src/core/contexts/processingContext';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { useIsSubformPage, useNavigationParam } from 'src/hooks/navigation';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { getDialogIdFromDataValues, getMessageBoxUrl } from 'src/utils/urls/urlHelper';

export function BackNavigationButton(props: Parameters<typeof Button>[0]) {
  const { langAsString } = useLanguage();
  const isMobile = useIsMobile();
  const party = useSelectedParty();
  const mainPageKey = useNavigationParam('mainPageKey');
  const isSubform = useIsSubformPage();
  const { returnUrl, isFetchingReturnUrl } = useReturnUrl();
  const { exitSubform } = useNavigatePage();
  const { performProcess, isAnyProcessing, isThisProcessing: isExitingSubform } = useIsProcessing();

  const dataValues = useInstanceDataQuery({ select: (instance) => instance.dataValues }).data;
  const dialogId = getDialogIdFromDataValues(dataValues);
  const messageBoxUrl = getMessageBoxUrl(party?.partyId, dialogId);

  if (isFetchingReturnUrl) {
    return (
      <Spinner
        data-size='sm'
        className={classes.spinner}
        aria-label={langAsString('general.loading')}
      />
    );
  }

  if (isSubform) {
    return (
      <Button
        onClick={() => performProcess(exitSubform)}
        disabled={isAnyProcessing}
        isLoading={isExitingSubform}
        variant='tertiary'
        size='sm'
        {...props}
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
        {...props}
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
        {...props}
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

// TODO: Change to useLocation.search and add tests to make sure it works as expected
function useReturnUrl() {
  const { fetchReturnUrl } = useAppQueries();
  // Unfortunately, since it is used like this it means it is not reactive and will not update
  // if the query parameter changes during the apps lifetime. But this is not likely to be an issue
  // as the value has to be base64 encoded so there will likely not be any valid update to this
  // after the app loads. We certainly don't touch it.
  const queryParameterReturnUrl = new URLSearchParams(globalThis.location.search).get('returnUrl');

  const { data, isFetching } = useQuery({
    queryKey: ['returnUrl', queryParameterReturnUrl],
    queryFn: queryParameterReturnUrl ? () => fetchReturnUrl(queryParameterReturnUrl) : skipToken,
  });

  return { returnUrl: data, isFetchingReturnUrl: isFetching };
}

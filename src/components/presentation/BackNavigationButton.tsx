import React from 'react';

import { Spinner } from '@digdir/designsystemet-react';
import { Left } from '@navikt/ds-icons';
import { skipToken, useQuery } from '@tanstack/react-query';
import cn from 'classnames';

import { Button } from 'src/app-components/Button/Button';
import classes from 'src/components/presentation/BackNavigationButton.module.css';
import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { useIsProcessing } from 'src/core/contexts/processingContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useCurrentParty } from 'src/features/party/PartiesProvider';
import { useIsSubformPage, useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { returnUrlToMessagebox } from 'src/utils/urls/urlHelper';

export function BackNavigationButton(props: Parameters<typeof Button>[0]) {
  const { langAsString } = useLanguage();
  const isMobile = useIsMobile();
  const party = useCurrentParty();
  const mainPageKey = useNavigationParam('mainPageKey');
  const isSubform = useIsSubformPage();
  const { returnUrl, isFetchingReturnUrl } = useReturnUrl();
  const { exitSubform } = useNavigatePage();
  const { performProcess, isAnyProcessing, isThisProcessing: isExitingSubform } = useIsProcessing();

  const messageBoxUrl = returnUrlToMessagebox(window.location.host, party?.partyId);

  if (isFetchingReturnUrl) {
    return (
      <Spinner
        size='sm'
        className={classes.spinner}
        title={langAsString('general.loading')}
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
          <Left
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
          <Left
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
          <Left
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

function useReturnUrl() {
  const { fetchReturnUrl } = useAppQueries();
  // Note that this looks at the actual query parameters, not the hash, this is intentional
  // as this feature is used for linking to the app with this query parameter set so that
  // we can return the user back where they came from.
  // Unfortunately, since it is used like this it means it is not reactive and will not update
  // if the query parameter changes during the apps lifetime. But this is not likely to be an issue
  // as the value has to be base64 encoded so there will likely not be any valid update to this
  // after the app loads. We certainly don't touch it.
  const queryParameterReturnUrl = new URLSearchParams(window.location.search).get('returnUrl');

  const { data, isFetching } = useQuery({
    queryKey: ['returnUrl', queryParameterReturnUrl],
    queryFn: queryParameterReturnUrl ? () => fetchReturnUrl(queryParameterReturnUrl) : skipToken,
  });

  return { returnUrl: data, isFetchingReturnUrl: isFetching };
}

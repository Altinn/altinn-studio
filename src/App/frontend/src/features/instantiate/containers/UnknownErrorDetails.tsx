import React, { useState } from 'react';

import { AccordionItem, Button, Flex } from '@app/form-component';
import { CheckmarkCircleIcon } from '@navikt/aksel-icons';
import type { AxiosError } from 'axios';

import classes from 'src/features/instantiate/containers/UnknownErrorDetails.module.css';
import { Lang } from 'src/features/language/Lang';
import { getAxiosErrorDetails } from 'src/utils/axiosErrorDetails';

interface UnknownErrorDetailsProps {
  error: Error | AxiosError;
  className?: string;
}

export function UnknownErrorDetails({ error, className }: UnknownErrorDetailsProps) {
  const [now] = useState(new Date());
  const [copied, setCopied] = useState(false);
  const [axiosError] = useState(() => getAxiosErrorDetails(error));
  const [location] = useState(window?.location.href);

  // Axios parses json responses, so the body is usually an object rather than a string
  const responseBody = JSON.stringify(axiosError?.responseData, null, 2);

  async function handleCopyErrorClicked() {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      location,
      time: now.toISOString(),
      ...axiosError,
    };
    if (navigator.clipboard) {
      // clipboard is only available in secure contexts (https)
      try {
        await navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
        setCopied(true);
      } catch (err) {
        window.logError('Failed to copy error info to clipboard', err);
      }
    }
  }

  return (
    <AccordionItem
      title={<Lang id='instantiate.unknown_error_show_details' />}
      className={className}
    >
      <div className={classes.detailsContainer}>
        <Flex
          container
          justifyContent='space-between'
          alignItems='center'
          direction='row'
        >
          <DetailItem
            name={error.name}
            value={error.message}
          />
          <Button
            variant='secondary'
            onClick={handleCopyErrorClicked}
          >
            {copied ? <Lang id='general.copied' /> : <Lang id='general.copy' />}
            {copied && (
              <CheckmarkCircleIcon
                fontSize='1rem'
                aria-hidden={true}
              />
            )}
          </Button>
        </Flex>

        <DetailItem
          name='Location'
          value={location}
        />

        <DetailItem
          name='Time'
          value={now.toISOString()}
        />

        {axiosError?.url && (
          <DetailItem
            name='Request url'
            value={axiosError.url}
          />
        )}

        {axiosError?.method && (
          <DetailItem
            name='Request method'
            value={axiosError.method}
          />
        )}

        {axiosError && (
          <DetailItem
            name='Response status'
            value={axiosError.responseStatus ? axiosError.responseStatus.toString() : ''}
          />
        )}

        {responseBody && (
          <DetailItem
            name='Response body'
            value={responseBody}
          />
        )}

        {error.stack && (
          <DetailItem
            name='Stacktrace'
            value={error.stack}
          />
        )}
      </div>
    </AccordionItem>
  );
}

function DetailItem({ name, value }: { name: string; value: string }) {
  return (
    <div>
      <div>
        <strong>{name}:</strong>
      </div>
      <div className={classes.detailValue}>{value}</div>
    </div>
  );
}

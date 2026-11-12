import React, { useState } from 'react';

import { AccordionItem, Button, Flex } from '@app/form-component';
import { CheckmarkCircleIcon } from '@navikt/aksel-icons';
import type { HttpError } from '@studio/http-client';

import classes from 'src/features/instantiate/containers/UnknownErrorDetails.module.css';
import { Lang } from 'src/features/language/Lang';
import { formatResponseBody, getHttpErrorDetails } from 'src/utils/httpErrorDetails';

interface UnknownErrorDetailsProps {
  error: Error | HttpError;
  className?: string;
}

export function UnknownErrorDetails({ error, className }: UnknownErrorDetailsProps) {
  const [now] = useState(new Date());
  const [copied, setCopied] = useState(false);
  const [httpErrorDetails] = useState(() => getHttpErrorDetails(error));
  const [location] = useState(window?.location.href);

  const responseBody = formatResponseBody(httpErrorDetails?.responseData);

  async function handleCopyErrorClicked() {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      location,
      time: now.toISOString(),
      ...httpErrorDetails,
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

        {httpErrorDetails?.url && (
          <DetailItem
            name='Request url'
            value={httpErrorDetails.url}
          />
        )}

        {httpErrorDetails?.method && (
          <DetailItem
            name='Request method'
            value={httpErrorDetails.method}
          />
        )}

        {httpErrorDetails && (
          <DetailItem
            name='Response status'
            value={httpErrorDetails.responseStatus ? httpErrorDetails.responseStatus.toString() : ''}
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

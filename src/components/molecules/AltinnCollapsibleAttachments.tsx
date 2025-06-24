import React, { useEffect, useState } from 'react';

import { Heading } from '@digdir/designsystemet-react';
import { CaretDownFillIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { AltinnCollapsible } from 'src/components/AltinnCollapsible';
import { AltinnAttachments } from 'src/components/atoms/AltinnAttachments';
import classes from 'src/components/molecules/AltinnCollapsibleAttachments.module.css';
import type { IDisplayAttachment } from 'src/types/shared';

interface IAltinnCollapsibleAttachmentsProps {
  attachments: IDisplayAttachment[] | undefined;
  title: React.ReactNode | undefined;
  hideCount?: boolean;
  showLinks: boolean | undefined;
  showDescription: boolean;
}

export function AltinnCollapsibleAttachments({
  attachments,
  title,
  hideCount,
  showLinks = true,
  showDescription,
}: IAltinnCollapsibleAttachmentsProps) {
  const isCollapsible = useIsPrint() ? false : Boolean(attachments && attachments.length > 4);
  const [open, setOpen] = React.useState(true);

  function handleOpenClose() {
    setOpen(!open);
  }

  const attachmentCount = hideCount ? '' : `(${attachments && attachments.length})`;

  if (isCollapsible) {
    return (
      <div id='attachment-collapsible-list'>
        <div
          tabIndex={0}
          role='button'
          onClick={handleOpenClose}
          onKeyPress={handleOpenClose}
          className={classes.container}
        >
          <CaretDownFillIcon
            aria-hidden='true'
            fontSize='1.5rem'
            className={cn({ [classes.transformArrowRight]: !open }, classes.transition)}
          />
          <Heading data-size='xs'>
            {title} {attachmentCount}
          </Heading>
        </div>
        <AltinnCollapsible open={open}>
          <AltinnAttachments
            attachments={attachments}
            showLinks={showLinks}
            showDescription={showDescription}
          />
        </AltinnCollapsible>
      </div>
    );
  }

  return (
    <AltinnAttachments
      id='attachment-list'
      title={
        <>
          {title} {attachmentCount}
        </>
      }
      attachments={attachments}
      showLinks={showLinks}
      showDescription={showDescription}
    />
  );
}

/**
 * Watches the print media query and returns true if the page is being printed
 */
function useIsPrint() {
  const [isPrint, setIsPrint] = useState(() => window.matchMedia('print').matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia('print');
    const handleChange = (event: MediaQueryListEvent) => setIsPrint(event.matches);
    mediaQueryList.addEventListener('change', handleChange);
    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, []);

  return isPrint;
}

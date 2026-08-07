import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { CaretDownFillIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Attachments } from './Attachments';
import { Collapsible } from './Collapsible';
import classes from './CollapsibleAttachments.module.css';
import type { DisplayAttachment } from './types';

export type CollapsibleAttachmentsProps = {
  attachments: DisplayAttachment[] | undefined;
  title: ReactElement;
  showLinks?: boolean;
  showDescription: boolean;
};

export function CollapsibleAttachments({
  attachments,
  title,
  showLinks = true,
  showDescription,
}: CollapsibleAttachmentsProps) {
  const isCollapsible = useIsPrint() ? false : Boolean(attachments && attachments.length > 4);
  const [open, setOpen] = useState(true);

  function handleOpenClose() {
    setOpen(!open);
  }

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
          {title}
        </div>
        <Collapsible open={open}>
          <Attachments
            attachments={attachments}
            showLinks={showLinks}
            showDescription={showDescription}
          />
        </Collapsible>
      </div>
    );
  }

  return (
    <Attachments
      id='attachment-list'
      title={title}
      attachments={attachments}
      showLinks={showLinks}
      showDescription={showDescription}
    />
  );
}

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

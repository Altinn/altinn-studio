import React from 'react';

import { Paragraph } from '@digdir/designsystemet-react';
import { CaretDownFillIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { AltinnCollapsable } from 'src/components/AltinnCollapsable';
import { AltinnAttachments } from 'src/components/atoms/AltinnAttachments';
import classes from 'src/components/molecules/AltinnCollapsibleAttachments.module.css';
import type { IDisplayAttachment } from 'src/types/shared';

interface IAltinnCollapsibleAttachmentsProps {
  attachments?: IDisplayAttachment[];
  collapsible?: boolean;
  title?: React.ReactNode;
  hideCount?: boolean;
}

const fontStyle = {
  fontSize: 18,
  fontWeight: 600,
};

export function AltinnCollapsibleAttachments({
  attachments,
  collapsible,
  title,
  hideCount,
}: IAltinnCollapsibleAttachmentsProps) {
  const [open, setOpen] = React.useState(true);

  function handleOpenClose() {
    setOpen(!open);
  }

  const attachmentCount = hideCount ? '' : `(${attachments && attachments.length})`;

  return collapsible ? (
    <div id='attachment-collapsible-list'>
      <div
        tabIndex={0}
        role='button'
        onClick={handleOpenClose}
        onKeyPress={handleOpenClose}
        className={classes.container}
      >
        <div className={cn({ [classes.transformArrowRight]: !open }, classes.transition)}>
          <CaretDownFillIcon
            aria-hidden='true'
            fontSize='1.5rem'
          />
        </div>
        {title} {attachmentCount}
      </div>
      <AltinnCollapsable open={open}>
        <AltinnAttachments attachments={attachments} />
      </AltinnCollapsable>
    </div>
  ) : (
    <>
      <Paragraph style={fontStyle}>
        {title} {attachmentCount}
      </Paragraph>
      <AltinnAttachments
        attachments={attachments}
        id='attachment-list'
      />
    </>
  );
}

import React, { useState } from 'react';
import { StudioButton } from '@studio/components';
import { BankNoteIcon, ChevronDownIcon, ChevronUpIcon, TruckIcon } from '@navikt/aksel-icons';
import classes from './PolicyAccordion.module.css';

interface PolicyAccordion {
  icon?: string;
  title: React.ReactNode;
  extraHeaderContent?: React.ReactNode;
  children: React.ReactNode;
}

export const PolicyAccordion = ({
  icon,
  title,
  extraHeaderContent,
  children,
}: PolicyAccordion): React.ReactNode => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div className={classes.accordion}>
      <div>
        <StudioButton
          fullWidth
          variant='tertiary'
          aria-expanded={isExpanded ? 'true' : 'false'}
          onClick={() => setIsExpanded((oldIsExpanded) => !oldIsExpanded)}
        >
          <div className={classes.accordionButton}>
            {icon === 'banknote' && <BankNoteIcon className={classes.accordionIcon} />}
            {icon === 'truck' && <TruckIcon className={classes.accordionIcon} />}
            {title}
          </div>
          {isExpanded ? (
            <ChevronUpIcon className={classes.accordionIcon} />
          ) : (
            <ChevronDownIcon className={classes.accordionIcon} />
          )}
        </StudioButton>
        {extraHeaderContent}
      </div>
      {isExpanded && <div className={classes.accordionContent}>{children}</div>}
    </div>
  );
};

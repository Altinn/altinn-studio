import React, { type ReactNode, type ReactElement, useId, useState } from 'react';
import { StudioButton, StudioLabelAsParagraph } from '@studio/components';
import { ChevronUpIcon, ChevronDownIcon } from '@studio/icons';
import classes from './PolicyAccordion.module.css';

export type PolicyAccordionProps = {
  icon?: ReactElement;
  title: string;
  subTitle: string;
  extraHeaderContent?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
};

export const PolicyAccordion = ({
  icon,
  title,
  subTitle,
  extraHeaderContent,
  defaultOpen,
  children,
}: PolicyAccordionProps): ReactElement => {
  const contentId = useId();
  const initialExpandedState: boolean = defaultOpen || false;
  const [isExpanded, setIsExpanded] = useState<boolean>(initialExpandedState);

  const handleToggleExpanded = (): void => {
    setIsExpanded((oldIsExpanded) => !oldIsExpanded);
  };

  return (
    <div className={classes.accordion}>
      <div className={classes.accordionHeader}>
        <StudioButton
          fullWidth
          variant='tertiary'
          aria-expanded={isExpanded ? 'true' : 'false'}
          aria-controls={contentId}
          onClick={handleToggleExpanded}
        >
          <div className={classes.accordionButton}>
            {icon}
            <div className={classes.accordionTitle}>
              <StudioLabelAsParagraph data-size='sm'>{title}</StudioLabelAsParagraph>
              <div className={classes.accordionSubTitle}>{subTitle}</div>
            </div>
          </div>
          <PolicyAccordionIcon isExpanded={isExpanded} />
        </StudioButton>
        {extraHeaderContent}
      </div>
      {isExpanded && (
        <div id={contentId} className={classes.accordionContent}>
          {children}
        </div>
      )}
    </div>
  );
};

const PolicyAccordionIcon = ({ isExpanded }: { isExpanded: boolean }): ReactNode => {
  const IconComponent = isExpanded ? ChevronUpIcon : ChevronDownIcon;
  return <IconComponent className={classes.accordionIcon} aria-hidden />;
};

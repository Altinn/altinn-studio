import React from 'react';
import { StudioCard, StudioHeading, StudioParagraph, StudioTag } from '@studio/components';
import classes from './TemplateSelector.module.css';

export type TemplateDetailsProps = {
  name: string;
  id: string;
  description?: string;
  owner: string;
};

export const TemplateDetails = ({
  name,
  id,
  description,
  owner,
}: TemplateDetailsProps): React.ReactElement => {
  return (
    <StudioCard variant='default' key={id}>
      <div className={classes.templateHeadingContainer}>
        <StudioHeading level={2} data-size='2xs' className={classes.templateName} spacing>
          {name || id}
        </StudioHeading>
        <StudioTag className={classes.templateOwner}>{owner}</StudioTag>
      </div>
      {description && <StudioParagraph>{description}</StudioParagraph>}
    </StudioCard>
  );
};

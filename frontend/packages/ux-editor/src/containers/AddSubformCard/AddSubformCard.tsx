import React from 'react';
import { StudioCard, StudioHeading } from '@studio/components-legacy';
import { PlusIcon } from '@navikt/aksel-icons';

export const AddSubformCard = () => {
  const handleClick = () => {
    undefined;
  };

  return (
    <StudioCard onClick={handleClick}>
      <div>{<PlusIcon />}</div>
      <div>
        <StudioHeading size='2xs'>{'Legg til underskjema'}</StudioHeading>
      </div>
    </StudioCard>
  );
};

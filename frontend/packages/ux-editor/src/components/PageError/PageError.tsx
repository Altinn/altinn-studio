import { InfoCard } from 'app-development/features/appPublish/pages/InfoCard';
import React from 'react';

type PageErrorProps = {
  error: Error;
};
export const PageError = ({ error }: PageErrorProps): JSX.Element => {
  return (
    <InfoCard headerText={error.name} shadow={true}>
      <p>{error.message}</p>
    </InfoCard>
  );
};

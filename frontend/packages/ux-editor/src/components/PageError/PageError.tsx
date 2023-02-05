import React from 'react';
import { InfoCard } from 'app-development/features/appPublish/pages/InfoCard';

type ErrorPageProps = {
  error: Error;
};
export const ErrorPage = ({ error }: ErrorPageProps): JSX.Element => {
  return (
    <InfoCard headerText={error.name} shadow={true}>
      <p>{error.message}</p>
    </InfoCard>
  );
};

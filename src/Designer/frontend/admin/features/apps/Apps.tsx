import React from 'react';
import { useParams } from 'react-router-dom';
import { AppsTable } from './components/AppsTable';

export const Apps = () => {
  const { org } = useParams();
  return (
    <div>
      <h1>Publiserte apper</h1>
      <AppsTable org={org} />
    </div>
  );
};

import React from 'react';
import { useLoaderData, useParams } from 'react-router-dom';

import type { pageLoader } from 'nextsrc/features/form/pages/page/pageLoader';

export const Page = () => {
  const { pageId } = useParams<{ pageId: string }>();

  const { layout, instance, dataElement } = useLoaderData() as Awaited<ReturnType<typeof pageLoader>>;

  console.log('instance', instance);

  if (!pageId) {
    return undefined;
  }

  return (
    <div>
      <h1>I am Page: {pageId}</h1>

      <h2>On this page, we need:</h2>

      <ul>
        {instance.data.map((dataElement) => (
          <li key={dataElement.id}>{dataElement.id}</li>
        ))}
      </ul>

      <ul>
        <li>the layoutSet (page) that we need to render</li>
        <li>The data for the layout set</li>
      </ul>

      <h2>Here is our layout:</h2>
      <pre>{JSON.stringify(layout, null, 2)}</pre>

      <h2>Here is our data:</h2>
      <pre>{JSON.stringify(dataElement, null, 2)}</pre>
    </div>
  );
};

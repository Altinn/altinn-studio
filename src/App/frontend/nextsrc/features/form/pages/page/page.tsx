import React from 'react';
import { useLoaderData, useParams } from 'react-router-dom';

import { FormEngine } from 'nextsrc/features/form/FormEngine/FormEngine';
import { useFormData, useLayout } from 'nextsrc/libs/form-client/form-context';
import type { pageLoader } from 'nextsrc/features/form/pages/page/pageLoader';

export const Page = () => {
  const { pageId } = useParams<{ pageId: string }>();

  const layout = useLayout(pageId ?? '');

  const { dataElement } = useLoaderData() as Awaited<ReturnType<typeof pageLoader>>;

  const formData = useFormData();

  if (!pageId) {
    return undefined;
  }

  if (!dataElement) {
    return undefined;
  }

  return (
    <div style={{ fontFamily: 'arial' }}>
      <h1>Intensjon:</h1>

      <ol>
        <li>Få et praktisk og bevisst forhold til opplevd kompleksitet i applikasjonslogikk</li>
        <ol>
          <li>Rendre repeterende gruppe</li>
          <li>Hide empty fields in rep gruppe</li>
          <li>(Lage summary)</li>
        </ol>
      </ol>

      <h2>Full form data from form client:</h2>
      <pre>{JSON.stringify(formData, null, 2)}</pre>
      <FormEngine
        data={dataElement}
        components={layout.data.layout}
      />
    </div>
  );
};

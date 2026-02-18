import React from 'react';
import { useLoaderData, useParams } from 'react-router';

import { FormEngine } from 'nextsrc/features/FormEngine/FormEngine';
import { useFormData, useLayout } from 'nextsrc/libs/form-client/form-context';
import type { pageLoader } from 'nextsrc/routes/instance/task/$pageId/page.loader';

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
      <FormEngine
        data={dataElement}
        components={layout.data.layout}
      />
      <h2>Full form data from form client:</h2>
      <pre>{JSON.stringify(formData, null, 2)}</pre>
    </div>
  );
};

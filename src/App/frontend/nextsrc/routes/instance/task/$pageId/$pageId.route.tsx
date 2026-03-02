import React from 'react';
import { useParams } from 'react-router';

import { useLayout } from 'nextsrc/libs/form-client/react/hooks';
import { AppComponentsBridge } from 'nextsrc/libs/form-engine/AppComponentsBridge';
import { FormEngine } from 'nextsrc/libs/form-engine/FormEngine';

export const Page = () => {
  const { pageId } = useParams<{ pageId: string }>();

  const layout = useLayout(pageId ?? '');

  if (!pageId) {
    return undefined;
  }

  return (
    <div style={{ fontFamily: 'arial' }}>
      <AppComponentsBridge>
        <FormEngine components={layout.data.layout} />
      </AppComponentsBridge>
    </div>
  );
};

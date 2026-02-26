import React from 'react';
import { useParams } from 'react-router';

import { useLayout } from 'nextsrc/libs/form-client/react/hooks';
import { FormEngine } from 'nextsrc/libs/form-engine/FormEngine';

/**
 * Debug display isolated into its own component so its useFormData()
 * subscription doesn't re-render the FormEngine on every keystroke.
 */
// function FormDataDebug() {
//   const formData = useFormData();
//   return (
//     <>
//       <h2>Full form data from form client:</h2>
//       <pre>{JSON.stringify(formData, null, 2)}</pre>
//     </>
//   );
// }

export const Page = () => {
  const { pageId } = useParams<{ pageId: string }>();

  const layout = useLayout(pageId ?? '');

  if (!pageId) {
    return undefined;
  }

  return (
    <div style={{ fontFamily: 'arial' }}>
      <FormEngine components={layout.data.layout} />
      {/*<FormDataDebug />*/}
    </div>
  );
};

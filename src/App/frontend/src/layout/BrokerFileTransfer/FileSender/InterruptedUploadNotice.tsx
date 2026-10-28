import React from 'react';

import { Alert, Paragraph } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';

type InterruptedUploadNoticeProps = {
  fileName: string;
  uploaded: number | null;
  size: number | null;
};

export function InterruptedUploadNotice({ fileName, uploaded, size }: InterruptedUploadNoticeProps) {
  return (
    <Alert data-color='info'>
      <Paragraph data-size='sm'>
        <Lang
          id='broker_file_transfer.interrupted'
          params={[fileName]}
        />
      </Paragraph>
      {uploaded !== null && !!size && (
        <Paragraph data-size='sm'>
          <Lang
            id='broker_file_transfer.interrupted_progress'
            params={[Math.floor((uploaded / size) * 100)]}
          />
        </Paragraph>
      )}
    </Alert>
  );
}

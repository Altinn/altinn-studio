import React from 'react';

import { Alert, Paragraph } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';

// Tells the user an earlier upload was interrupted, and how far it got

type InterruptedUploadNoticeProps = {
  fileName: string;
  uploaded: number;
  size: number;
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
      {size > 0 && (
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

import React from 'react';
import { useDispatch } from 'react-redux';

import { Button, ButtonColor } from '@digdir/design-system-react';
import { FilePdfIcon } from '@navikt/aksel-icons';

import { DevToolsActions } from 'src/features/devtools/data/devToolsSlice';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { ProcessTaskType } from 'src/types';

export const PDFPreviewButton = () => {
  const dispatch = useDispatch();
  const { taskType } = useAppSelector((state) => state.process);

  function handler() {
    dispatch(DevToolsActions.previewPdf());
  }

  return (
    <Button
      onClick={handler}
      disabled={taskType !== ProcessTaskType.Data}
      color={ButtonColor.Secondary}
      icon={<FilePdfIcon aria-hidden />}
    >
      Forhåndsvis PDF
    </Button>
  );
};

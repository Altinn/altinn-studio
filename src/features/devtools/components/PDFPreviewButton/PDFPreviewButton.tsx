import React from 'react';
import { useDispatch } from 'react-redux';

import { Button, Fieldset } from '@digdir/design-system-react';
import { FilePdfIcon } from '@navikt/aksel-icons';

import { DevToolsActions } from 'src/features/devtools/data/devToolsSlice';
import { useTaskTypeFromBackend } from 'src/features/instance/ProcessContext';
import { ProcessTaskType } from 'src/types';

export const PDFPreviewButton = () => {
  const dispatch = useDispatch();
  const taskType = useTaskTypeFromBackend();

  function handler() {
    dispatch(DevToolsActions.previewPdf());
  }

  return (
    <Fieldset
      legend='Forhåndsvis PDF'
      description={
        !(window as any).chrome
          ? 'Vær oppmerksom på at forhåndsvisningen ikke vil se riktig ut i andre nettlesere enn Google Chrome.'
          : undefined
      }
    >
      <Button
        onClick={handler}
        size='small'
        disabled={taskType !== ProcessTaskType.Data}
        color='second'
        icon={<FilePdfIcon aria-hidden />}
      >
        Forhåndsvis PDF
      </Button>
    </Fieldset>
  );
};

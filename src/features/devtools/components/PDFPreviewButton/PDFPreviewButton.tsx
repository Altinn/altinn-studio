import React from 'react';

import { Button, Fieldset } from '@digdir/design-system-react';
import { FilePdfIcon } from '@navikt/aksel-icons';

import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { useTaskTypeFromBackend } from 'src/features/instance/ProcessContext';
import { ProcessTaskType } from 'src/types';

export const PDFPreviewButton = () => {
  const taskType = useTaskTypeFromBackend();
  const setPdfPreview = useDevToolsStore((state) => state.actions.setPdfPreview);

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
        onClick={() => setPdfPreview(true)}
        size='small'
        disabled={taskType !== ProcessTaskType.Data}
        color='second'
      >
        {<FilePdfIcon aria-hidden />}
        Forhåndsvis PDF
      </Button>
    </Fieldset>
  );
};

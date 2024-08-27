import React from 'react';

import { Button, Fieldset } from '@digdir/designsystemet-react';
import { FilePdfIcon } from '@navikt/aksel-icons';

import { PDFGeneratorPreview } from 'src/features/devtools/components/PDFPreviewButton/PDFGeneratorPreview';
import classes from 'src/features/devtools/components/PDFPreviewButton/PDFPreview.module.css';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { useTaskTypeFromBackend } from 'src/features/instance/ProcessContext';
import { useIsLocalOrStaging } from 'src/hooks/useIsDev';
import { ProcessTaskType } from 'src/types';

export const PDFPreviewButton = () => {
  const taskType = useTaskTypeFromBackend();
  const setPdfPreview = useDevToolsStore((state) => state.actions.setPdfPreview);

  // PDF generator is not available in altinn studio preview, and the preview API is disabled in production
  const isLocalOrStaging = useIsLocalOrStaging();

  return (
    <Fieldset
      legend='Forhåndsvis PDF'
      description={
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        !(window as any).chrome ? (
          <span>
            Vær oppmerksom på at <code>Forhåndsvis PDF</code> ikke vil se riktig ut i andre nettlesere enn Google
            Chrome.
          </span>
        ) : undefined
      }
      className={classes.fieldset}
    >
      <Button
        onClick={() => setPdfPreview(true)}
        size='small'
        disabled={taskType !== ProcessTaskType.Data}
        color='second'
      >
        {
          <FilePdfIcon
            fontSize='1rem'
            aria-hidden
          />
        }
        Forhåndsvis PDF
      </Button>
      {isLocalOrStaging && <PDFGeneratorPreview />}
    </Fieldset>
  );
};

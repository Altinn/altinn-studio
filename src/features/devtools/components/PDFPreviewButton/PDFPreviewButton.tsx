import React from 'react';

import { Fieldset } from '@digdir/designsystemet-react';
import { FilePdfIcon } from '@navikt/aksel-icons';

import { Button } from 'src/app-components/button/Button';
import { PDFGeneratorPreview } from 'src/components/PDFGeneratorPreview/PDFGeneratorPreview';
import classes from 'src/features/devtools/components/PDFPreviewButton/PDFPreview.module.css';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { useTaskTypeFromBackend } from 'src/features/instance/ProcessContext';
import { useIsStudioPreview } from 'src/hooks/useIsDev';
import { ProcessTaskType } from 'src/types';

export const PDFPreviewButton = () => {
  const taskType = useTaskTypeFromBackend();
  const setPdfPreview = useDevToolsStore((state) => state.actions.setPdfPreview);

  // PDF generator is not available in altinn studio preview
  const isStudioPreview = useIsStudioPreview();

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
      {!isStudioPreview && (
        <PDFGeneratorPreview
          showErrorDetails={true}
          buttonTitle={'Generer PDF'}
        />
      )}
    </Fieldset>
  );
};

import React from 'react';

import { Fieldset } from '@digdir/designsystemet-react';
import { FilePdfIcon } from '@navikt/aksel-icons';

import { Button } from 'src/app-components/Button/Button';
import { PDFGeneratorPreview } from 'src/components/PDFGeneratorPreview/PDFGeneratorPreview';
import classes from 'src/features/devtools/components/PDFPreviewButton/PDFPreview.module.css';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { useTaskTypeFromBackend } from 'src/features/instance/useProcessQuery';
import { ProcessTaskType } from 'src/types';
import { isStudioPreview } from 'src/utils/isDev';

export const PDFPreviewButton = () => {
  const taskType = useTaskTypeFromBackend();
  const setPdfPreview = useDevToolsStore((state) => state.actions.setPdfPreview);

  return (
    <Fieldset className={classes.fieldset}>
      <Fieldset.Legend>Forhåndsvis PDF</Fieldset.Legend>
      <Fieldset.Description>
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          !(window as any).chrome ? (
            <span>
              Vær oppmerksom på at <code>Forhåndsvis PDF</code> ikke vil se riktig ut i andre nettlesere enn Google
              Chrome.
            </span>
          ) : undefined
        }
      </Fieldset.Description>
      <Button
        onClick={() => setPdfPreview(true)}
        disabled={taskType !== ProcessTaskType.Data}
        color='second'
      >
        <FilePdfIcon
          fontSize='1rem'
          aria-hidden
        />
        Forhåndsvis PDF
      </Button>
      {/* PDF generator is not available in altinn studio preview */}
      {!isStudioPreview() && (
        <PDFGeneratorPreview
          showErrorDetails={true}
          buttonTitle='Generer PDF'
        />
      )}
    </Fieldset>
  );
};

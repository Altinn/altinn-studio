import React from 'react';
import { useDispatch } from 'react-redux';

import { Button, ButtonColor, FieldSet } from '@digdir/design-system-react';
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
    <FieldSet
      legend='Forhåndsvis PDF'
      description={
        !(window as any).chrome
          ? 'Vær oppmerksom på at forhåndsvisningen ikke vil se riktig ut i andre nettlesere enn Google Chrome.'
          : undefined
      }
    >
      <Button
        onClick={handler}
        disabled={taskType !== ProcessTaskType.Data}
        color={ButtonColor.Secondary}
        icon={<FilePdfIcon aria-hidden />}
      >
        Forhåndsvis PDF
      </Button>
    </FieldSet>
  );
};

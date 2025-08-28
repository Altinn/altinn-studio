import React, { useRef, useState } from 'react';
import { usePdf } from '../../../../hooks/usePdf/usePdf';
import { ConvertChoicesModal } from './ConvertPageToPdfWhenExistingModal/ConvertChoicesModal';
import { useSavableFormLayoutSettings } from '@altinn/ux-editor/hooks/useSavableFormLayoutSettings';
import { PdfConfigCard } from './PdfConfigCard';

export const PdfConfig = () => {
  const { getPdfLayoutName, convertCurrentPageToPdf } = usePdf();
  const [isPdfUpdated, setIsPdfUpdated] = useState(false);
  const savableLayoutSettings = useSavableFormLayoutSettings();
  const convertChoicesDialogRef = useRef<HTMLDialogElement>(null);

  const shouldShowModal: boolean = Boolean(getPdfLayoutName());

  const handleClickConvertButton = () => {
    if (shouldShowModal) {
      convertChoicesDialogRef.current?.showModal();
    } else {
      convertCurrentPageToPdf();
      savableLayoutSettings.save();
    }
  };

  const handleModalAction = () => {
    // Trigger re-render after modal action
    setIsPdfUpdated(!isPdfUpdated);
  };

  return (
    <div>
      <ConvertChoicesModal handleModalAction={handleModalAction} ref={convertChoicesDialogRef} />
      <PdfConfigCard onClickConvert={handleClickConvertButton} />
    </div>
  );
};

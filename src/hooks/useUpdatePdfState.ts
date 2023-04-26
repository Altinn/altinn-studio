import { useEffect } from 'react';

import { PdfActions } from 'src/features/pdf/data/pdfSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { shouldGeneratePdf } from 'src/utils/pdf';

export const useUpdatePdfState = (allowAnonymous: boolean | undefined) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const toggleEventListeners = (eventListener: 'addEventListener' | 'removeEventListener') => {
      const eventsToListenTo = ['hashchange'];
      eventsToListenTo.forEach((event) => window[eventListener](event, setPdfState));
    };

    function setPdfState() {
      if (shouldGeneratePdf()) {
        dispatch(PdfActions.pdfStateChanged());
      }
    }

    if (allowAnonymous === false) {
      toggleEventListeners('addEventListener');

      return () => {
        toggleEventListeners('removeEventListener');
      };
    }
  }, [allowAnonymous, dispatch]);
};

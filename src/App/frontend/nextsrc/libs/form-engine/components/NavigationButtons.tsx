import React from 'react';

import { useNavigate, useParams } from 'react-router';
import { useStore } from 'zustand';

import { useProcessActions } from 'nextsrc/features/process/ProcessActionsContext';
import { usePageOrder } from 'nextsrc/libs/form-client/react/hooks';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';

import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

export const NavigationButtons = (_props: ComponentProps) => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const pageOrder = usePageOrder();
  const client = useFormClient();
  const hasErrors = useStore(client.validationStore, (state) => state.hasErrors());
  const processActions = useProcessActions();

  const currentIndex = pageId ? pageOrder.indexOf(pageId) : -1;
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= pageOrder.length - 1;

  const handlePrevious = () => {
    if (!isFirst) {
      navigate(`../${pageOrder[currentIndex - 1]}`, { relative: 'path' });
    }
  };

  const handleNext = () => {
    if (hasErrors) {
      return;
    }
    if (!isLast) {
      navigate(`../${pageOrder[currentIndex + 1]}`, { relative: 'path' });
    }
  };

  const handleSubmit = () => {
    if (hasErrors) {
      return;
    }
    processActions?.submit();
  };

  return (
    <div data-testid='NavigationButtons'>
      {!isFirst && (
        <button
          type='button'
          data-testid='NavigationButtons-previous'
          onClick={handlePrevious}
        >
          Back
        </button>
      )}
      {isLast ? (
        <button
          type='button'
          data-testid='NavigationButtons-submit'
          onClick={handleSubmit}
          disabled={processActions?.isSubmitting}
        >
          {processActions?.isSubmitting ? 'Sender inn...' : 'Send inn'}
        </button>
      ) : (
        <button
          type='button'
          data-testid='NavigationButtons-next'
          onClick={handleNext}
        >
          Next
        </button>
      )}
    </div>
  );
};

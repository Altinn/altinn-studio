import { useCallback } from 'react';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import type Selection from 'diagram-js/lib/features/selection/Selection';
import { useBpmnContext } from '../contexts/BpmnContext';
import { useBpmnApiContext } from '../contexts/BpmnApiContext';

/**
 * Replaces the process in the editor with the process as it is saved, and selects the given element in it.
 * The editor keeps its current state if the saved process cannot be fetched or imported.
 */
export const useReloadSavedProcess = (): ((elementIdToSelect?: string) => Promise<void>) => {
  const { modelerRef, setBpmnDetails, isReloadingRef } = useBpmnContext();
  const { getSavedBpmn } = useBpmnApiContext();

  return useCallback(
    async (elementIdToSelect?: string): Promise<void> => {
      try {
        const savedXml = await getSavedBpmn();
        setBpmnDetails(null);
        // Importing clears the command stack without firing "commandStack.changed", so it does not save.
        isReloadingRef.current = true;
        await modelerRef.current?.importXML(savedXml);
      } catch {
        return;
      } finally {
        isReloadingRef.current = false;
      }
      const modeler = modelerRef.current;
      const element =
        elementIdToSelect &&
        modeler?.get<ElementRegistry>('elementRegistry').get(elementIdToSelect);
      if (element) modeler.get<Selection>('selection').select(element);
    },
    [getSavedBpmn, setBpmnDetails, isReloadingRef, modelerRef],
  );
};

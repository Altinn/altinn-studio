import { useEffect } from 'react';
import type { Element, Connection } from 'bpmn-js/lib/model/Types';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import type Overlays from 'diagram-js/lib/features/overlays/Overlays';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../contexts/BpmnContext';
import { useBpmnApiContext } from '../../contexts/BpmnApiContext';
import { useBpmnDiagramVersion } from '../../hooks/useBpmnDiagramVersion';
import {
  getFlowOutcome,
  hasKnownFiksArkivRouting,
  isFiksArkivGateway,
} from '../../utils/fiksArkivRouting';
import classes from './FiksArkivFlowLabels.module.css';

/** Derived labels never change BPMN names or add undo entries when a diagram is opened. */
export function FiksArkivFlowLabels(): null {
  const { modelerRef, isInitialized } = useBpmnContext();
  const { fiksArkivRouting } = useBpmnApiContext();
  const { t } = useTranslation();
  const version = useBpmnDiagramVersion();
  useEffect(() => {
    if (!isInitialized || !hasKnownFiksArkivRouting(fiksArkivRouting)) return;
    const overlays = modelerRef.current.get<Overlays>('overlays');
    const registry = modelerRef.current.get<ElementRegistry>('elementRegistry');
    const type = 'fiks-arkiv-outcome';
    registry
      .filter((element) => isFiksArkivGateway(element.source as Element))
      .forEach((element) => {
        const flow = element as Connection;
        const outcome = getFlowOutcome(flow, fiksArkivRouting);
        if (outcome !== 'success' && outcome !== 'failure') return;
        const points = flow.waypoints;
        if (!points || points.length < 2) return;
        const segment = Math.floor((points.length - 1) / 2);
        const start = points[segment];
        const end = points[segment + 1];
        const label = document.createElement('span');
        label.className = classes.label;
        label.textContent = t(`process_editor.fiks_arkiv_routing.${outcome}`);
        overlays.add(flow, type, {
          position: {
            left: (start.x + end.x) / 2 - Math.min(...points.map((point) => point.x)),
            top: (start.y + end.y) / 2 - Math.min(...points.map((point) => point.y)) + 8,
          },
          html: label,
        });
      });
    return () => overlays.remove({ type });
  }, [isInitialized, modelerRef, fiksArkivRouting, t, version]);
  return null;
}

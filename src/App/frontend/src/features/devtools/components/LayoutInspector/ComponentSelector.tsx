import React, { useCallback, useEffect, useRef, useState } from 'react';

import { FingerButtonIcon } from '@navikt/aksel-icons';

import { Button } from 'src/app-components/Button/Button';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { setHighlightStyle } from 'src/features/devtools/hooks/useComponentHighlighter';

type ComponentSelectorProps = {
  type: 'component' | 'node';
};

export function ComponentSelector({ type }: ComponentSelectorProps) {
  const [active, setActive] = useState(false);
  const selectNode = useDevToolsStore((state) => state.actions.focusNodeInspector);
  const selectComponent = useDevToolsStore((state) => state.actions.focusLayoutInspector);

  const selected = useRef<string | null>(null);
  // eslint-disable-next-line no-undef
  const listenersRef = useRef<{ eventType: string; listener: EventListener }[]>([]);

  const highlightElementsRef = useRef(new Map<Element, Element>());

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!active) {
      activate();
    } else {
      deactivate();
    }
  }

  function activate() {
    cleanup();

    const moveListener = function (event: MouseEvent) {
      let newElement: Element | null = null;
      let newId: string | null = null;

      const elementsToCheck = new Set<Element>();
      const hoverElements = document.elementsFromPoint(event.clientX, event.clientY);
      loop: for (const element of hoverElements) {
        let e: Element | null = element;
        while (e) {
          if (elementsToCheck.has(e)) {
            continue loop;
          }

          elementsToCheck.add(e);
          e = e.parentElement;
        }
      }

      for (const element of elementsToCheck) {
        const id = element.getAttribute(type === 'node' ? 'data-componentid' : 'data-componentbaseid');
        if (id) {
          newElement = element;
          newId = id;
          break;
        }
      }

      selected.current = newId;

      if (newElement && !highlightElementsRef.current.has(newElement)) {
        const highlightElement = document.createElement('div');
        setHighlightStyle(highlightElement, newElement as HTMLElement);
        document.body.appendChild(highlightElement);
        highlightElementsRef.current.set(newElement, highlightElement);
      }

      for (const [element, highlightElement] of highlightElementsRef.current.entries()) {
        if (element !== newElement) {
          highlightElement.remove();
          highlightElementsRef.current.delete(element);
        }
      }
    };

    const clickListener = function () {
      if (selected.current) {
        if (type === 'node') {
          selectNode(selected.current);
        } else {
          selectComponent(selected.current);
        }
        deactivate();
      }
    };

    const escapeListener = function (event: KeyboardEvent) {
      if (event.key === 'Escape') {
        deactivate();
      }
    };

    listenersRef.current.push({ eventType: 'mousemove', listener: moveListener });
    listenersRef.current.push({ eventType: 'click', listener: clickListener });
    listenersRef.current.push({ eventType: 'keydown', listener: escapeListener });

    for (const { eventType, listener } of listenersRef.current) {
      window.addEventListener(eventType, listener);
    }
    setActive(true);
  }

  function deactivate() {
    cleanup();
    setActive(false);
  }

  const cleanup = useCallback(() => {
    for (const { eventType, listener } of listenersRef.current) {
      window.removeEventListener(eventType, listener);
    }
    listenersRef.current = [];

    for (const highlightElement of highlightElementsRef.current.values()) {
      highlightElement.remove();
    }
    highlightElementsRef.current = new Map();

    selected.current = null;
  }, []);

  // Clean up event listener on unmount
  useEffect(() => cleanup, [cleanup]);

  return (
    <Button
      title={type === 'node' ? 'Velg en komponent' : 'Velg en layout-komponent'}
      onClick={toggle}
      variant={active ? 'primary' : 'tertiary'}
      color='second'
      style={{
        marginTop: -10,
        marginBottom: -10,
        marginRight: -10,
        overflow: 'visible',
        width: 30,
        height: 30,
        minWidth: 0,
        minHeight: 0,
      }}
    >
      <FingerButtonIcon
        fontSize={20}
        aria-hidden
      />
    </Button>
  );
}

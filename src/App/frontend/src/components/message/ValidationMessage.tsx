import React, { Children, cloneElement, isValidElement } from 'react';
import type { ReactNode } from 'react';

import {
  CheckmarkCircleIcon,
  ExclamationmarkTriangleIcon,
  InformationSquareIcon,
  XMarkOctagonFillIcon,
} from '@navikt/aksel-icons';

import classes from 'src/components/message/ValidationMessage.module.css';
import { Lang, LangReference } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useNavigateToComponent } from 'src/hooks/useNavigatePage';
import utilClasses from 'src/styles/utils.module.css';
import { DataModelLocationProviderFromNode } from 'src/utils/layout/DataModelLocation';
import type { NodeRefValidation } from 'src/features/validation';

export const validationSeverityPresentation = {
  error: { Icon: XMarkOctagonFillIcon, color: 'danger' },
  warning: { Icon: ExclamationmarkTriangleIcon, color: 'warning' },
  info: { Icon: InformationSquareIcon, color: 'info' },
  success: { Icon: CheckmarkCircleIcon, color: 'success' },
} as const;

export function ValidationMessage({
  validation,
  onNavigate,
  navigateToField = true,
}: {
  validation: NodeRefValidation;
  onNavigate?: () => void;
  navigateToField?: boolean;
}) {
  return (
    <DataModelLocationProviderFromNode
      nodeId={validation.nodeId}
      replace
    >
      <MessageContent
        validation={validation}
        onNavigate={onNavigate}
        navigateToField={navigateToField}
      />
    </DataModelLocationProviderFromNode>
  );
}

function MessageContent({
  validation,
  onNavigate,
  navigateToField,
}: {
  validation: NodeRefValidation;
  onNavigate?: () => void;
  navigateToField: boolean;
}) {
  const { lang } = useLanguage();
  const navigate = useNavigateToComponent();
  const { Icon, color } = validationSeverityPresentation[validation.severity];
  const message = lang(
    validation.message.key,
    validation.message.params,
    validation.message.customTextParameters,
    validation.message.fallback,
  );
  const handleNavigate = () => {
    onNavigate?.();
    void navigate(validation.nodeId, validation.baseComponentId, { error: validation });
  };

  return (
    <div className={classes.message}>
      <span
        data-color={color}
        className={classes.severityIcon}
      >
        <Icon aria-hidden />
        <span className={utilClasses.visuallyHidden}>
          <Lang id={`group.validation_severity_${validation.severity}`} />
        </span>
      </span>
      <div>
        {navigateToField ? (
          <NavigableMessage
            onNavigate={handleNavigate}
            nodeId={validation.nodeId}
          >
            {message}
          </NavigableMessage>
        ) : (
          <LangReference reference={validation.message} />
        )}
      </div>
    </div>
  );
}

// Parsed messages can contain external or app-specific links. Leave those links independent
// of field navigation so they keep their own destinations and never sit inside a button.
// Only known phrasing elements may be placed inside a navigation button. Keep flow
// containers and custom components intact and navigate from the text inside them.
function isNavigablePhrasing(node: ReactNode): boolean {
  if (!isValidElement<{ children?: ReactNode }>(node)) {
    return true;
  }
  return (
    typeof node.type === 'string' &&
    ['span', 'strong', 'em', 'b', 'i', 'u', 's', 'small', 'sub', 'sup', 'code', 'abbr', 'br'].includes(node.type) &&
    !isMessageLink(node) &&
    Children.toArray(node.props.children).every(isNavigablePhrasing)
  );
}

function hasNavigableText(node: ReactNode): boolean {
  return Children.toArray(node).some((child) =>
    isValidElement<{ children?: ReactNode }>(child)
      ? hasNavigableText(child.props.children)
      : /[\p{L}\p{N}]/u.test(String(child)),
  );
}

function isMessageLink(node: React.ReactElement<{ children?: ReactNode }>): boolean {
  return 'href' in node.props || 'to' in node.props || 'setting' in node.props;
}

export function NavigableMessage({
  children,
  onNavigate,
  nodeId,
}: {
  children: ReactNode;
  onNavigate: () => void;
  nodeId: string;
}): ReactNode {
  const parts: ReactNode[] = [];
  let text: ReactNode[] = [];
  const flushText = () => {
    if (text.length === 0) {
      return;
    }
    if (!hasNavigableText(text)) {
      parts.push(...text);
      text = [];
      return;
    }
    const lastPart = text.at(-1);
    const trailingSpace = typeof lastPart === 'string' ? lastPart.match(/\s+$/)?.[0] : undefined;
    if (trailingSpace && typeof lastPart === 'string') {
      text[text.length - 1] = lastPart.trimEnd();
    }
    parts.push(
      <button
        key={parts.length}
        type='button'
        className={classes.messageLink}
        onClick={onNavigate}
        data-target-node={nodeId}
      >
        {text}
      </button>,
    );
    if (trailingSpace) {
      parts.push(trailingSpace);
    }
    text = [];
  };

  for (const child of Children.toArray(children)) {
    if (isNavigablePhrasing(child)) {
      text.push(child);
      continue;
    }
    flushText();
    if (!isValidElement<{ children?: ReactNode }>(child)) {
      continue;
    }
    parts.push(
      isMessageLink(child) || child.props.children === undefined
        ? child
        : cloneElement(
            child,
            {},
            <NavigableMessage
              onNavigate={onNavigate}
              nodeId={nodeId}
            >
              {child.props.children}
            </NavigableMessage>,
          ),
    );
  }
  flushText();
  return parts;
}

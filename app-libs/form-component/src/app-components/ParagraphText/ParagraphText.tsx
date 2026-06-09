import { type PropsWithChildren, type ReactNode } from 'react';

import { Paragraph as DsParagraph } from '@digdir/designsystemet-react';

function isInlineNode(node: ReactNode): boolean {
  return Boolean(node && typeof node === 'object' && 'type' in node && node.type === 'span');
}

export function ParagraphText({ children }: PropsWithChildren) {
  // The text resolver wraps inline content in a <span>; block-level content (headings, lists,
  // etc.) is not, and must be wrapped in a <div> rather than nested directly inside a <p>.
  const inline = isInlineNode(children);
  return <DsParagraph asChild={!inline}>{inline ? children : <div>{children}</div>}</DsParagraph>;
}

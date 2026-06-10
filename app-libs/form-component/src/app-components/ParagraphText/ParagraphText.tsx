import { type PropsWithChildren, type ReactNode } from 'react';

import { Paragraph as DsParagraph } from '@digdir/designsystemet-react';

function isInlineNode(node: ReactNode): boolean {
  return Boolean(node && typeof node === 'object' && 'type' in node && node.type === 'span');
}

export function ParagraphText({ children }: PropsWithChildren) {
  const inline = isInlineNode(children);
  return <DsParagraph asChild={!inline}>{inline ? children : <div>{children}</div>}</DsParagraph>;
}

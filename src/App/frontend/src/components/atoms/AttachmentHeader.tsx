import React from 'react';

import { Heading } from '@digdir/designsystemet-react';

export function MainAttachmentHeader({
  title,
  className,
}: {
  title: React.ReactElement | undefined;
  className?: string;
}) {
  if (!title) {
    return null;
  }

  return (
    <Heading
      level={2}
      data-size='sm'
      className={className}
    >
      {title}
    </Heading>
  );
}

export function SubAttachmentHeader({ title }: { title: React.ReactElement }) {
  return (
    <Heading
      level={3}
      data-size='xs'
    >
      {title}
    </Heading>
  );
}

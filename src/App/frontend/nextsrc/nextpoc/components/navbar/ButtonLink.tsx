import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@digdir/designsystemet-react';

interface ButtonLinkProps {
  to: string;
  className?: string;
  children: React.ReactNode;
  isCurrent: boolean;
}

export function ButtonLink({ to, className, children, isCurrent }: ButtonLinkProps) {
  const navigate = useNavigate();
  const handleClick = () => navigate(to);

  return (
    <Button
      onClick={handleClick}
      className={className}
      {...(isCurrent && { 'aria-current': 'page' })}
    >
      {children}
    </Button>
  );
}

import React from 'react';

interface ICustomIconProps {
  iconUrl: string;
  iconAlt: string | undefined;
  size?: string;
}

export function CustomIcon({ iconUrl, iconAlt, size }: ICustomIconProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <img
        src={iconUrl}
        alt={iconAlt}
        data-testid='custom-icon'
        style={{
          width: size,
          height: size,
        }}
      />
    </div>
  );
}

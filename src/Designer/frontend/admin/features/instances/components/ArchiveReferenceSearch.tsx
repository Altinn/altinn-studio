import React, { useEffect, useState } from 'react';
import { useEffectEventPolyfill } from 'admin/hooks/useEffectEvent';
import { Label, Search } from '@digdir/designsystemet-react';

type ArchiveReferenceSearchProps = {
  value: string;
  setValue: (value: string) => void;
};

export const ArchiveReferenceSearch = ({ value, setValue }: ArchiveReferenceSearchProps) => {
  const [searchString, setSearchString] = useState(value);

  return (
    <div>
      <Label data-size='md'>Arkivreferanse</Label>
      <Search
        variant={searchString != value ? 'primary' : 'simple'}
        label='Arkivreferanse'
        value={searchString}
        onChange={(event) => setSearchString(event.target.value)}
        onSearchClick={() => setValue(searchString)}
        onClear={() => {
          setSearchString('');
          setValue('');
        }}
      />
    </div>
  );
};

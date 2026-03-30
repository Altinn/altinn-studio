import { StudioLanguagePicker } from '../StudioLanguagePicker';
import type { StudioLanguagePickerProps } from '../StudioLanguagePicker';
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { ArrayUtils } from '@studio/pure-functions';

export function UncontrolledLanguagePicker({
  languageCodes: initialLanguageCodes,
  onAdd,
  onRemove,
  ...rest
}: StudioLanguagePickerProps): ReactElement {
  const [languageCodes, setLanguageCodes] = useState<string[]>(initialLanguageCodes);

  const handleAdd = useCallback(
    (code: string) => {
      setLanguageCodes([...languageCodes, code]);
      onAdd(code);
    },
    [languageCodes, setLanguageCodes, onAdd],
  );

  const handleRemove = useCallback(
    (code: string) => {
      setLanguageCodes(ArrayUtils.removeItemByValue(languageCodes, code));
      onRemove(code);
    },
    [languageCodes, setLanguageCodes, onRemove],
  );

  return (
    <StudioLanguagePicker
      languageCodes={languageCodes}
      onAdd={handleAdd}
      onRemove={handleRemove}
      {...rest}
    />
  );
}

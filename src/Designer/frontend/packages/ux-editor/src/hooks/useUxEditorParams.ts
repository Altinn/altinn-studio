import { useParams } from 'react-router-dom';

export type UxEditorParams = {
  layoutSet: string;
};

export default function useUxEditorParams(): Readonly<Partial<UxEditorParams>> {
  return useParams<UxEditorParams>();
}

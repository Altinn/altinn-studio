interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

export type FileKind = 'content' | 'url' | 'problem';

type LibraryFileBase = {
  path: string;
  contentType: string;
};

export type BackendLibraryFile<Kind extends FileKind = FileKind> = {
  content: LibraryFileBase & { content: string };
  url: LibraryFileBase & { url: string };
  problem: LibraryFileBase & { problem: ProblemDetails };
}[Kind];

export type LibraryFile<Kind extends FileKind = FileKind> = {
  [K in Kind]: BackendLibraryFile<K> & { kind: K };
}[Kind];

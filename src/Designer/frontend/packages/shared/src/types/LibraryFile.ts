interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

type FileKind = 'content' | 'url' | 'problem';

type LibraryFileBase<Kind extends FileKind> = {
  kind: Kind;
  path: string;
  contentType: string;
};

export type LibraryFile<Kind extends FileKind = FileKind> = {
  content: LibraryFileBase<'content'> & { content: string };
  url: LibraryFileBase<'url'> & { url: string };
  problem: LibraryFileBase<'problem'> & { problem: ProblemDetails };
}[Kind];

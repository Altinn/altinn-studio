export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

export interface LibraryFile {
  path: string;
  contentType: string;
  content?: string;
  url?: string;
  problem?: ProblemDetails;
}

export interface GetSharedResourcesResponse {
  files: LibraryFile[];
  commitSha: string;
}

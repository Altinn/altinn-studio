export interface FileMetadata {
  path: string;
  content: string | null;
  encoding?: string;
}

export interface UpdateSharedResourcesRequest {
  files: FileMetadata[];
  baseCommitSha: string;
  commitMessage?: string;
}

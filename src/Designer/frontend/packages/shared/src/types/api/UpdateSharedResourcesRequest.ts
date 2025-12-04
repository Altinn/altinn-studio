export interface FileMetadata {
  path: string;
  content: string;
  encoding?: string;
}

export interface UpdateSharedResourcesRequest {
  files: FileMetadata[];
  baseCommitSha: string;
  commitMessage?: string;
}

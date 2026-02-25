package internal

import "errors"

var (
	errContextRequired        = errors.New("context is required")
	errComponentRequired      = errors.New("component is required")
	errBaseBranchRequired     = errors.New("base branch is required")
	errRepoRootRequired       = errors.New("repo root is required")
	errGitRequired            = errors.New("git client is required")
	errChangelogNil           = errors.New("changelog is required")
	errReleaseVersionRequired = errors.New("version is required")
	errValidationBaseRequired = errors.New("base commit is required")
	errValidationHeadRequired = errors.New("head commit is required")
	errChangelogVersionExists = errors.New("version already exists in changelog")
	errReleaseBranchMissing   = errors.New("release branch does not exist for patch release")
	errReleaseBranchExists    = errors.New("release branch already exists; use patch version")
	errBackportCommitRequired = errors.New("commit SHA is required")
	errBackportBranchRequired = errors.New("release branch version is required (e.g., v1.0)")
	errBackportNoEntries      = errors.New("no changelog entries found in commit")
	errBackportInvalidVersion = errors.New("invalid branch version format (expected vX.Y)")
	errUnsafeCleanDirPath     = errors.New("refusing to clean unsafe directory path")
	errNoExistingParentPath   = errors.New("path has no existing parent directory")
)

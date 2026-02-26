package internal

import (
	"context"
	"fmt"
)

func ensureWorkingTreeClean(ctx context.Context, git GitRunner, log Logger) error {
	if git == nil {
		return errGitRequired
	}
	if log == nil {
		log = NopLogger{}
	}

	clean, err := git.WorkingTreeClean(ctx)
	if err != nil {
		return fmt.Errorf("check working tree: %w", err)
	}
	if clean {
		return nil
	}

	log.Error("Working tree has uncommitted changes")
	log.Error("Commit or stash changes before releasing:")
	log.Error("  git add -A && git commit -m 'your message'")
	log.Error("  or: git stash")
	return ErrWorkingTreeDirty
}

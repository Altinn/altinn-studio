package osutil

import (
	"fmt"
	"os"
)

func closeLockFile(file *os.File) error {
	if err := file.Close(); err != nil {
		return fmt.Errorf("close lock file: %w", err)
	}
	return nil
}

package config

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

var projectRoot string
var projectRootError error
var once sync.Once

func TryFindProjectRootByGoMod() (string, error) {
	tryFindProjectRoot := func() (string, error) {
		basePath, err := os.Getwd()
		if err != nil {
			return "", fmt.Errorf("error getting project root: %w", err)
		}

		for range 100 {
			goModPath := filepath.Join(basePath, "go.mod")
			_, err := os.Stat(goModPath)
			if err == nil {
				return basePath, nil
			} else if !os.IsNotExist(err) {
				return "", fmt.Errorf("error getting project root: %w", err)
			}

			parentPath := filepath.Dir(basePath)
			if parentPath == basePath {
				return "", fmt.Errorf("error getting project root: reached root of file system")
			}
			basePath = parentPath
		}

		return "", fmt.Errorf("error getting project root, reached max directory traversal")
	}

	once.Do(func() {
		projectRoot, projectRootError = tryFindProjectRoot()
	})
	return projectRoot, projectRootError
}

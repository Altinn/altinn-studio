package config

import (
	"fmt"
	"os"
	"path/filepath"
)

func TryFindProjectRoot() string {
	for {
		if fileExists("./go.mod") || fileExists("./*.env") {
			currentDir, err := os.Getwd()
			if err != nil {
				return ""
			}
			return currentDir
		}

		if err := os.Chdir(".."); err != nil {
			return ""
		}
	}
}

func fileExists(pattern string) bool {
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return false
	}

	return len(matches) > 0
}

func GetConfigFilePathForEnv(env string) string {
	rootDir := TryFindProjectRoot()
	if rootDir == "" {
		return ""
	}

	return filepath.Join(rootDir, fmt.Sprintf("%s.env", env))
}

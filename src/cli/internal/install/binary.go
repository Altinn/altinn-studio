package install

import (
	"errors"
	"fmt"
	"os"
	"runtime"

	"altinn.studio/studioctl/internal/osutil"
)

const (
	exeSuffix = ".exe"

	executablePerm = 0o755
)

func installBinaryName() string {
	binaryName := "studioctl"
	if runtime.GOOS == osutil.OSWindows {
		binaryName += exeSuffix
	}
	return binaryName
}

func installFile(srcPath, targetPath string) (string, error) {
	installedPath, err := atomicCopyFile(srcPath, targetPath)
	if err != nil {
		return "", fmt.Errorf("copy binary: %w", err)
	}
	if runtime.GOOS != osutil.OSWindows {
		if err := os.Chmod(installedPath, executablePerm); err != nil {
			return "", fmt.Errorf("make binary executable: %w", err)
		}
	}

	return installedPath, nil
}

func (b Bundle) installBinary() (installedPath string, alreadyInstalled bool, err error) {
	installedPath, err = installFile(b.BinaryPath, b.installPath)
	if err != nil {
		if errors.Is(err, errAlreadyInstalled) {
			return installedPath, true, nil
		}
		return "", false, err
	}

	return installedPath, false, nil
}

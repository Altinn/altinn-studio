package install

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

const (
	checksumAssetName = "SHA256SUMS"

	sha256HexLength = 64
)

var (
	errChecksumAssetNotFound = errors.New("asset checksum not found")
)

func writeSHA256SUMS(outputDir, sumsFile string, exclude map[string]bool) error {
	entries, err := os.ReadDir(outputDir)
	if err != nil {
		return fmt.Errorf("read output dir: %w", err)
	}

	var lines []string
	for _, entry := range entries {
		if entry.IsDir() || exclude[entry.Name()] {
			continue
		}
		sum, err := fileSHA256(filepath.Join(outputDir, entry.Name()))
		if err != nil {
			return fmt.Errorf("checksum %s: %w", entry.Name(), err)
		}
		lines = append(lines, fmt.Sprintf("%s  %s", sum, entry.Name()))
	}

	return writeFile(filepath.Join(outputDir, sumsFile), strings.Join(lines, "\n")+"\n")
}

func checksumForAsset(checksumFile []byte, asset string) (string, error) {
	for line := range strings.SplitSeq(string(checksumFile), "\n") {
		fields := strings.Fields(strings.TrimSpace(line))
		if len(fields) < 2 {
			continue
		}

		sum := strings.ToLower(fields[0])
		name := strings.TrimPrefix(fields[len(fields)-1], "*")
		if name == asset {
			if len(sum) != sha256HexLength {
				break
			}
			return sum, nil
		}
	}

	return "", fmt.Errorf("%w: %s", errChecksumAssetNotFound, asset)
}

func fileSHA256(path string) (hashValue string, err error) {
	//nolint:gosec // G304: path is from caller-owned install/package input.
	file, err := os.Open(path)
	if err != nil {
		return "", fmt.Errorf("open file for checksum %q: %w", path, err)
	}
	defer func() {
		err = closeWithError(file, "close checksum file", err)
	}()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", fmt.Errorf("hash file %q: %w", path, err)
	}
	return hex.EncodeToString(hash.Sum(nil)), nil
}

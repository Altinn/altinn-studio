package harness

import (
	"bytes"
	"fmt"
	"os"
	"path"
	"strings"
	"testing"
)

func Snapshot(t *testing.T, data []byte, name string, ext string) {
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Couldn't get working directory: %v", err)
	}

	testName := strings.ReplaceAll(t.Name(), "/", "_")
	if name != "" {
		testName = fmt.Sprintf("%s_%s", testName, name)
	}

	var directoryMode os.FileMode
	wdStat, err := os.Stat(wd)
	if err != nil {
		directoryMode = 0755
		t.Logf("Failed to get working directory mode, defaulting to %d: %v", directoryMode, err)
	} else {
		directoryMode = wdStat.Mode()
	}
	directory := path.Join(wd, "_snapshots")
	err = os.MkdirAll(directory, directoryMode)
	if err != nil {
		t.Fatalf("Couldn't create snapshot directory: %v", err)
	}

	if ext == "" {
		ext = "txt"
	}
	fileName := path.Join(wd, "_snapshots", testName) + "." + ext

	if IsCI {
		existingData, readErr := os.ReadFile(fileName)
		if readErr != nil {
			t.Errorf("Error reading existing snapshot at: %s: %v", fileName, readErr)
			return
		} else if !bytes.Equal(existingData, data) {
			t.Errorf("Snapshots not equal for: %s", fileName)
			return
		}
	}

	err = os.WriteFile(fileName, data, 0644)
	if err != nil {
		t.Fatalf("Error writing snapshot: %v", err)
	}
}

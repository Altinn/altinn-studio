//go:build windows

package self //nolint:testpackage // Tests cover the unexported registry update against a scratch key.

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"testing"

	"golang.org/x/sys/windows/registry"
)

// scratchEnvironmentKey creates a key under HKCU\Software, named after the test and name, and deletes it afterwards.
func scratchEnvironmentKey(t *testing.T, name string) registry.Key {
	t.Helper()

	path := fmt.Sprintf(`Software\studioctl-test-%d-%s-%s`, os.Getpid(), strings.ReplaceAll(t.Name(), "/", "-"), name)
	key, _, err := registry.CreateKey(registry.CURRENT_USER, path, registry.ALL_ACCESS)
	if err != nil {
		t.Fatalf("create scratch key: %v", err)
	}
	t.Cleanup(func() {
		if err := key.Close(); err != nil {
			t.Errorf("close scratch key: %v", err)
		}
		if err := registry.DeleteKey(registry.CURRENT_USER, path); err != nil {
			t.Errorf("delete scratch key: %v", err)
		}
	})
	return key
}

func appendTestInstallDir(value string, expand func(string) string) (string, bool) {
	return appendPathListEntry(value, testInstallDir, expand)
}

func removeTestInstallDir(value string, expand func(string) string) (string, bool) {
	return removePathListEntry(value, testInstallDir, expand)
}

func readPathValue(t *testing.T, key registry.Key) (string, uint32) {
	t.Helper()

	value, valueType, err := key.GetStringValue(pathValueName)
	if err != nil {
		t.Fatalf("read Path: %v", err)
	}
	return value, valueType
}

func TestUpdatePathValueKeepsExpandableEntries(t *testing.T) {
	key := scratchEnvironmentKey(t, "path")
	original := `%USERPROFILE%\bin;C:\Tools`
	if err := key.SetExpandStringValue(pathValueName, original); err != nil {
		t.Fatalf("seed Path: %v", err)
	}

	changed, err := updatePathValue(key, appendTestInstallDir)
	if err != nil || !changed {
		t.Fatalf("append: changed = %v, err = %v; want true, nil", changed, err)
	}
	value, valueType := readPathValue(t, key)
	if value != original+";"+testInstallDir || valueType != registry.EXPAND_SZ {
		t.Fatalf(
			"after append: Path = %q (type %d), want %q (EXPAND_SZ)",
			value,
			valueType,
			original+";"+testInstallDir,
		)
	}

	changed, err = updatePathValue(key, appendTestInstallDir)
	if err != nil || changed {
		t.Fatalf("second append: changed = %v, err = %v; want false, nil", changed, err)
	}

	changed, err = updatePathValue(key, removeTestInstallDir)
	if err != nil || !changed {
		t.Fatalf("remove: changed = %v, err = %v; want true, nil", changed, err)
	}
	value, valueType = readPathValue(t, key)
	if value != original || valueType != registry.EXPAND_SZ {
		t.Fatalf("after remove: Path = %q (type %d), want %q (EXPAND_SZ)", value, valueType, original)
	}
}

func TestUpdatePathValueKeepsPlainStringType(t *testing.T) {
	key := scratchEnvironmentKey(t, "path")
	if err := key.SetStringValue(pathValueName, `C:\Tools`); err != nil {
		t.Fatalf("seed Path: %v", err)
	}

	if _, err := updatePathValue(key, appendTestInstallDir); err != nil {
		t.Fatalf("append: %v", err)
	}
	if _, valueType := readPathValue(t, key); valueType != registry.SZ {
		t.Fatalf("Path type = %d, want SZ", valueType)
	}
}

func TestUpdatePathValueCreatesMissingValue(t *testing.T) {
	key := scratchEnvironmentKey(t, "path")

	changed, err := updatePathValue(key, appendTestInstallDir)
	if err != nil || !changed {
		t.Fatalf("append: changed = %v, err = %v; want true, nil", changed, err)
	}
	value, valueType := readPathValue(t, key)
	if value != testInstallDir || valueType != registry.EXPAND_SZ {
		t.Fatalf("Path = %q (type %d), want %q (EXPAND_SZ)", value, valueType, testInstallDir)
	}
}

func TestUpdatePathValueLeavesUnreadableValueAlone(t *testing.T) {
	key := scratchEnvironmentKey(t, "path")
	if err := key.SetDWordValue(pathValueName, 1); err != nil {
		t.Fatalf("seed Path: %v", err)
	}

	changed, err := updatePathValue(key, appendTestInstallDir)
	if !errors.Is(err, registry.ErrUnexpectedType) || changed {
		t.Fatalf("append: changed = %v, err = %v; want false, ErrUnexpectedType", changed, err)
	}
	if value, _, err := key.GetIntegerValue(pathValueName); err != nil || value != 1 {
		t.Fatalf("Path = %d, err = %v; want the DWORD 1 untouched", value, err)
	}
}

func TestUpdatePathValueExpandsVariablesOnlyInExpandableValues(t *testing.T) {
	t.Setenv("STUDIOCTL_TEST_PROGRAMS", `C:\Users\me\AppData\Local\Programs`)
	entry := `%STUDIOCTL_TEST_PROGRAMS%\studioctl`

	expandable := scratchEnvironmentKey(t, "expandable")
	if err := expandable.SetExpandStringValue(pathValueName, entry); err != nil {
		t.Fatalf("seed expandable Path: %v", err)
	}
	if changed, err := updatePathValue(expandable, appendTestInstallDir); err != nil || changed {
		t.Fatalf("EXPAND_SZ append: changed = %v, err = %v; want false, nil", changed, err)
	}

	plain := scratchEnvironmentKey(t, "plain")
	if err := plain.SetStringValue(pathValueName, entry); err != nil {
		t.Fatalf("seed plain Path: %v", err)
	}
	if changed, err := updatePathValue(plain, appendTestInstallDir); err != nil || !changed {
		t.Fatalf("SZ append: changed = %v, err = %v; want true, nil", changed, err)
	}
}

func TestIsOwnInstallDir(t *testing.T) {
	t.Setenv("LOCALAPPDATA", `C:\Users\me\AppData\Local`)

	for dir, want := range map[string]bool{
		`c:\users\me\appdata\local\programs\studioctl\`: true,
		`C:\Users\me\.local\bin`:                        false,
	} {
		if got := IsOwnInstallDir(dir); got != want {
			t.Fatalf("IsOwnInstallDir(%q) = %v, want %v", dir, got, want)
		}
	}
}

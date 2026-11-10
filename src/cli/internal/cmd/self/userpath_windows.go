//go:build windows

package self

import (
	"errors"
	"fmt"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"

	"altinn.studio/studioctl/internal/ui"
)

const (
	userEnvironmentKey = "Environment"
	pathValueName      = "Path"

	hwndBroadcast             = 0xffff
	wmSettingChange           = 0x001a
	smtoAbortIfHung           = 0x0002
	settingChangeTimeoutMilli = 5000
)

var errBroadcastEnvironmentChange = errors.New("SendMessageTimeoutW failed")

// pathUpdate rewrites a PATH value. expand resolves %VAR% the way Windows does for the value's registry type.
type pathUpdate func(value string, expand func(string) string) (string, bool)

// AddToUserPath appends dir to the current user's PATH and reports whether the PATH changed.
func AddToUserPath(dir string, out *ui.Output) (bool, error) {
	return updateUserPath(out, func(value string, expand func(string) string) (string, bool) {
		return appendPathListEntry(value, dir, expand)
	})
}

// RemoveFromUserPath removes dir from the current user's PATH and reports whether the PATH changed.
func RemoveFromUserPath(dir string, out *ui.Output) (bool, error) {
	return updateUserPath(out, func(value string, expand func(string) string) (string, bool) {
		return removePathListEntry(value, dir, expand)
	})
}

func updateUserPath(out *ui.Output, update pathUpdate) (changed bool, err error) {
	key, err := registry.OpenKey(registry.CURRENT_USER, userEnvironmentKey, registry.QUERY_VALUE|registry.SET_VALUE)
	if err != nil {
		return false, fmt.Errorf("open user environment: %w", err)
	}
	defer func() {
		if closeErr := key.Close(); closeErr != nil && err == nil {
			err = fmt.Errorf("close user environment: %w", closeErr)
		}
	}()

	changed, err = updatePathValue(key, update)
	if err != nil || !changed {
		return changed, err
	}
	// Explorer reloads the environment on this broadcast, so terminals opened from it see the new PATH.
	if broadcastErr := broadcastEnvironmentChange(); broadcastErr != nil && out != nil {
		out.Verbosef("failed to announce the PATH change: %v", broadcastErr)
	}
	return true, nil
}

// updatePathValue rewrites the Path value under key and keeps its registry type, so entries such as
// %USERPROFILE%\bin still expand. It writes nothing when the value cannot be read.
func updatePathValue(key registry.Key, update pathUpdate) (bool, error) {
	value, valueType, err := key.GetStringValue(pathValueName)
	switch {
	case errors.Is(err, registry.ErrNotExist):
		value, valueType = "", registry.EXPAND_SZ
	case err != nil:
		return false, fmt.Errorf("read user PATH: %w", err)
	}

	// Windows expands %VAR% entries only in an EXPAND_SZ value.
	expand := func(entry string) string { return entry }
	if valueType == registry.EXPAND_SZ {
		expand = expandRegistryString
	}
	updated, changed := update(value, expand)
	if !changed {
		return false, nil
	}
	if valueType == registry.EXPAND_SZ {
		err = key.SetExpandStringValue(pathValueName, updated)
	} else {
		err = key.SetStringValue(pathValueName, updated)
	}
	if err != nil {
		return false, fmt.Errorf("write user PATH: %w", err)
	}
	return true, nil
}

func expandRegistryString(value string) string {
	expanded, err := registry.ExpandString(value)
	if err != nil {
		return value
	}
	return expanded
}

func broadcastEnvironmentChange() error {
	proc := windows.NewLazySystemDLL("user32.dll").NewProc("SendMessageTimeoutW")
	if err := proc.Find(); err != nil {
		return fmt.Errorf("find SendMessageTimeoutW: %w", err)
	}
	environment, err := windows.UTF16PtrFromString(userEnvironmentKey)
	if err != nil {
		return fmt.Errorf("encode broadcast parameter: %w", err)
	}
	var result uintptr
	sent, _, callErr := proc.Call(
		hwndBroadcast,
		wmSettingChange,
		0,
		uintptr(unsafe.Pointer(environment)), //nolint:gosec // G103: the API takes a pointer to a UTF-16 string.
		smtoAbortIfHung,
		settingChangeTimeoutMilli,
		uintptr(unsafe.Pointer(&result)), //nolint:gosec // G103: the API writes its result through a pointer.
	)
	if sent == 0 {
		return fmt.Errorf("%w: %w", errBroadcastEnvironmentChange, callErr)
	}
	return nil
}

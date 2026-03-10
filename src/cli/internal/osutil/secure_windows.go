//go:build windows

package osutil

import (
	"errors"
	"fmt"
	"os"

	"golang.org/x/sys/windows"
)

// ErrPathIsDirectory is returned when a path is a directory but a file was expected.
var ErrPathIsDirectory = errors.New("path is a directory, not a file")

// SecureFile sets owner-only access on a file using Windows ACLs.
func SecureFile(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("stat file: %w", err)
	}
	if info.IsDir() {
		return fmt.Errorf("%w", ErrPathIsDirectory)
	}

	token := windows.GetCurrentProcessToken()
	tokenUser, err := token.GetTokenUser()
	if err != nil {
		return fmt.Errorf("get token user: %w", err)
	}
	ownerSID := tokenUser.User.Sid

	explicitAccess := []windows.EXPLICIT_ACCESS{
		{
			AccessPermissions: windows.GENERIC_ALL,
			AccessMode:        windows.GRANT_ACCESS,
			Inheritance:       windows.NO_INHERITANCE,
			Trustee: windows.TRUSTEE{ //nolint:exhaustruct // MultipleTrustee fields intentionally zero for single trustee
				TrusteeForm:  windows.TRUSTEE_IS_SID,
				TrusteeType:  windows.TRUSTEE_IS_USER,
				TrusteeValue: windows.TrusteeValueFromSID(ownerSID),
			},
		},
	}

	acl, err := windows.ACLFromEntries(explicitAccess, nil)
	if err != nil {
		return fmt.Errorf("create ACL: %w", err)
	}

	err = windows.SetNamedSecurityInfo(
		path,
		windows.SE_FILE_OBJECT,
		windows.DACL_SECURITY_INFORMATION|windows.PROTECTED_DACL_SECURITY_INFORMATION,
		nil, // don't change owner
		nil, // don't change group
		acl,
		nil, // don't change SACL
	)
	if err != nil {
		return fmt.Errorf("set security info: %w", err)
	}

	return nil
}

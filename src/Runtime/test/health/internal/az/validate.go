package az

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os/exec"
	"regexp"
	"strings"
)

var errInvalidUserFormat = errors.New("invalid user format")

// Account represents the Azure account information.
type Account struct {
	User struct {
		Name string `json:"name"`
	} `json:"user"`
}

// ValidateAzCLI checks if the az CLI is installed and available.
func ValidateAzCLI() error {
	cmd := exec.CommandContext(context.Background(), "az", "--version")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("az CLI not found or not working: %w", err)
	}
	return nil
}

// ValidateUserLogin validates that the user is logged in with the correct format
// Expected format: ext-<username> ai-dev account (prod or non-prod).
func ValidateUserLogin() error {
	cmd := exec.CommandContext(context.Background(), "az", "account", "show")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to get account info: %w (output: %s)", err, string(output))
	}

	var account Account
	if err := json.Unmarshal(output, &account); err != nil {
		return fmt.Errorf("failed to parse account info: %w", err)
	}

	username := strings.ToLower(account.User.Name)

	pattern := regexp.MustCompile(`^ext-[a-z0-9]+(-prod)?@ai-dev\.no$`)
	if !pattern.MatchString(username) {
		return fmt.Errorf(
			"%w: %s (expected: ext-<username>(-prod)?@ai-dev.no)",
			errInvalidUserFormat,
			account.User.Name,
		)
	}

	return nil
}

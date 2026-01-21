package cmd

// Test-only accessors to keep unit tests in cmd_test while still validating
// non-exported behavior.

func ExportParseUpPort(args []string) (int, bool, error) {
	c := &EnvCommand{}
	flags, helpShown, err := c.parseUpFlags(args)
	return flags.port, helpShown, err
}

func ExportValidateAliasName(name string) error {
	return validateAliasName(name)
}

func ExportFormatAliasLine(shell, aliasName, binaryPath string) string {
	return formatAliasLine(shell, aliasName, binaryPath)
}

func ExportShouldInitializeConfig(args []string) bool {
	return shouldInitializeConfig(args)
}

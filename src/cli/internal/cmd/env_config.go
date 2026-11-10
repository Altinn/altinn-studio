package cmd

import (
	"errors"
	"flag"
	"fmt"
	"io"
	"strconv"
	"strings"

	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

const (
	envConfigPortKey = "port"
	envConfigList    = "list"
	envConfigGet     = "get"
	envConfigSet     = "set"
	envConfigUnset   = "unset"
)

var errUnknownSetting = errors.New("unknown setting")

// envConfigSetting is one setting of studioctl env, as env config shows it.
type envConfigSetting struct {
	Key     string `json:"key"`
	Value   int    `json:"value"`
	Default int    `json:"default"`
	Set     bool   `json:"set"`
}

type envConfigArgs struct {
	positional []string
	jsonOutput bool
}

func (c *EnvCommand) configUsage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s env config [subcommand] [options]", osutil.CurrentBin()),
		"",
		"Show or change the defaults of the environment.",
		"",
		"Subcommands:",
		"  list               Show the settings (the default)",
		"  get KEY            Print a setting's value",
		"  set KEY VALUE      Change a setting",
		"  unset KEY          Go back to the built-in default",
		"",
		"Settings:",
		"  port               Host port env up starts a new environment on without --port (built-in: "+
			envtopology.DefaultIngressPortString()+")",
		"",
		"Options:",
		"  --json             Output as JSON (list and get)",
	)
}

func (c *EnvCommand) runConfig(args []string) error {
	subCmd, subArgs := envConfigList, args
	if len(args) > 0 && !strings.HasPrefix(args[0], "-") {
		subCmd, subArgs = args[0], args[1:]
	}

	switch subCmd {
	case envConfigList:
		return c.runConfigList(subArgs)
	case envConfigGet:
		return c.runConfigGet(subArgs)
	case envConfigSet:
		return c.runConfigSet(subArgs)
	case envConfigUnset:
		return c.runConfigUnset(subArgs)
	case helpSubcmd:
		c.out.Print(c.configUsage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, subCmd)
	}
}

func (c *EnvCommand) runConfigList(args []string) error {
	parsed, helpShown, err := c.parseConfigArgs(envConfigList, args, 0)
	if err != nil || helpShown {
		return err
	}
	settings, err := c.loadSettings()
	if err != nil {
		return err
	}
	list := []envConfigSetting{portSetting(settings)}
	if parsed.jsonOutput {
		return printJSONOutput(c.out, "env config list", list)
	}
	table := ui.NewTable(ui.NewColumn("Setting"), ui.NewColumn("Value"))
	for _, setting := range list {
		table.Row(ui.Text(setting.Key), ui.Text(describeSettingValue(setting)))
	}
	c.out.RenderTable(table)
	return nil
}

func (c *EnvCommand) runConfigGet(args []string) error {
	parsed, helpShown, err := c.parseConfigArgs(envConfigGet, args, 1)
	if err != nil || helpShown {
		return err
	}
	if err = checkSettingKey(parsed.positional[0]); err != nil {
		return err
	}
	settings, err := c.loadSettings()
	if err != nil {
		return err
	}
	setting := portSetting(settings)
	if parsed.jsonOutput {
		return printJSONOutput(c.out, "env config get", setting)
	}
	c.out.Println(strconv.Itoa(setting.Value))
	return nil
}

func (c *EnvCommand) runConfigSet(args []string) error {
	parsed, helpShown, err := c.parseConfigArgs(envConfigSet, args, 2)
	if err != nil || helpShown {
		return err
	}
	if err = checkSettingKey(parsed.positional[0]); err != nil {
		return err
	}
	port, err := strconv.Atoi(parsed.positional[1])
	if err != nil {
		return fmt.Errorf("%w: port: %q is not a number", ErrInvalidFlagValue, parsed.positional[1])
	}
	if err = envlocaltest.ValidatePublicPort(port, envConfigPortKey); err != nil {
		return fmt.Errorf("%w: %w", ErrInvalidFlagValue, err)
	}
	return c.updatePort(port)
}

func (c *EnvCommand) runConfigUnset(args []string) error {
	parsed, helpShown, err := c.parseConfigArgs(envConfigUnset, args, 1)
	if err != nil || helpShown {
		return err
	}
	if err = checkSettingKey(parsed.positional[0]); err != nil {
		return err
	}
	return c.updatePort(0)
}

// updatePort saves the port setting, zero for the built-in default. An environment that exists keeps its port until
// env down.
func (c *EnvCommand) updatePort(port int) error {
	settings, err := c.loadSettings()
	if err != nil {
		return err
	}
	settings.Env.Port = port
	if err := config.SaveSettings(c.cfg, settings); err != nil {
		return fmt.Errorf("env config: %w", err)
	}
	c.out.Printlnf("env up now starts a new environment on port %d. One that exists keeps its port until env down.",
		portSetting(settings).Value)
	return nil
}

func (c *EnvCommand) parseConfigArgs(subCmd string, args []string, positional int) (envConfigArgs, bool, error) {
	var parsed envConfigArgs
	for len(args) > 0 && len(parsed.positional) < positional && !isFlag(args[0]) {
		parsed.positional = append(parsed.positional, args[0])
		args = args[1:]
	}

	fs := flag.NewFlagSet("env config "+subCmd, flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	if subCmd == envConfigList || subCmd == envConfigGet {
		fs.BoolVar(&parsed.jsonOutput, "json", false, "Output as JSON")
	}
	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			c.out.Print(c.configUsage())
			return parsed, true, nil
		}
		return parsed, false, fmt.Errorf("parsing flags: %w", err)
	}
	if len(parsed.positional) != positional || fs.NArg() > 0 {
		return parsed, false, fmt.Errorf("%w: usage: %s env config %s", ErrInvalidFlagValue, osutil.CurrentBin(),
			configUsageLine(subCmd))
	}
	return parsed, false, nil
}

// isFlag reports whether an argument is a flag rather than a value. A negative number is a value, so that set
// refuses it as a port rather than as an unknown flag.
func isFlag(arg string) bool {
	if _, err := strconv.Atoi(arg); err == nil {
		return false
	}
	return strings.HasPrefix(arg, "-")
}

func configUsageLine(subCmd string) string {
	switch subCmd {
	case envConfigGet:
		return envConfigGet + " KEY"
	case envConfigSet:
		return envConfigSet + " KEY VALUE"
	case envConfigUnset:
		return envConfigUnset + " KEY"
	default:
		return envConfigList
	}
}

func (c *EnvCommand) loadSettings() (config.Settings, error) {
	settings, err := config.LoadSettings(c.cfg)
	if err != nil {
		return config.Settings{}, fmt.Errorf("env config: %w", err)
	}
	return settings, nil
}

func checkSettingKey(key string) error {
	if key != envConfigPortKey {
		return fmt.Errorf("%w: %s (settings: %s)", errUnknownSetting, key, envConfigPortKey)
	}
	return nil
}

func portSetting(settings config.Settings) envConfigSetting {
	defaultPort := envtopology.DefaultIngressPort()
	value := settings.Env.Port
	if value == 0 {
		value = defaultPort
	}
	return envConfigSetting{
		Key:     envConfigPortKey,
		Value:   value,
		Default: defaultPort,
		Set:     settings.Env.Port != 0,
	}
}

func describeSettingValue(setting envConfigSetting) string {
	if setting.Set {
		return strconv.Itoa(setting.Value)
	}
	return strconv.Itoa(setting.Value) + " (built-in)"
}

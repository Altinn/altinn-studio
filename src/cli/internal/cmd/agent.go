package cmd

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"

	agentskills "altinn.studio/studioctl/internal/cmd/agent/skills"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/osutil"
	"altinn.studio/studioctl/internal/ui"
)

// AgentCommand implements the 'agent' subcommand.
type AgentCommand struct {
	out     *ui.Output
	service *agentskills.Service
}

// NewAgentCommand creates a new agent command.
func NewAgentCommand(cfg *config.Config, out *ui.Output) *AgentCommand {
	return &AgentCommand{out: out, service: agentskills.NewService(cfg)}
}

// Name returns the command name.
func (c *AgentCommand) Name() string { return "agent" }

// Synopsis returns a short description.
func (c *AgentCommand) Synopsis() string { return "Manage integrations for coding agents" }

// Usage returns the full help text.
func (c *AgentCommand) Usage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s agent <subcommand> [options]", osutil.CurrentBin()),
		"",
		"Manage integrations for AI coding agents.",
		"",
		"Subcommands:",
		"  skills    Manage Agent Skills distributed with studioctl",
		"",
		fmt.Sprintf("Run '%s agent <subcommand> --help' for more information.", osutil.CurrentBin()),
	)
}

// Run executes the command.
func (c *AgentCommand) Run(_ context.Context, args []string) error {
	if len(args) == 0 {
		c.out.Print(c.Usage())
		return nil
	}

	switch args[0] {
	case "skills":
		return c.runSkills(args[1:])
	case "-h", flagHelp, helpSubcmd:
		c.out.Print(c.Usage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, args[0])
	}
}

func (c *AgentCommand) runSkills(args []string) error {
	if len(args) == 0 {
		c.out.Print(c.skillsUsage())
		return nil
	}

	switch args[0] {
	case "list":
		return c.runSkillsList(args[1:])
	case "path":
		return c.runSkillsPath(args[1:])
	case "install":
		return c.runSkillsInstall(args[1:])
	case "-h", flagHelp, helpSubcmd:
		c.out.Print(c.skillsUsage())
		return nil
	default:
		return fmt.Errorf("%w: %s", ErrUnknownSubcommand, args[0])
	}
}

func (c *AgentCommand) skillsUsage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s agent skills <subcommand> [options]", osutil.CurrentBin()),
		"",
		"Manage Agent Skills distributed with studioctl.",
		"",
		"Subcommands:",
		"  list       List available Agent Skills",
		"  path       Print the canonical path to an Agent Skill",
		"  install    Install an Agent Skill for a coding-agent harness",
		"",
		fmt.Sprintf("Run '%s agent skills <subcommand> --help' for more information.", osutil.CurrentBin()),
	)
}

func (c *AgentCommand) runSkillsList(args []string) error {
	if len(args) > 0 && isHelpArg(args[0]) {
		c.out.Print(c.skillsListUsage())
		return nil
	}
	if len(args) != 0 {
		return fmt.Errorf("%w: usage: %s agent skills list", ErrInvalidFlagValue, osutil.CurrentBin())
	}

	skills, err := c.service.List()
	if err != nil {
		return fmt.Errorf("list Agent Skills: %w", err)
	}
	c.out.Println("Available Agent Skills:")
	for _, skill := range skills {
		c.out.Printlnf("  %-20s  %s", skill.Name, skill.Description)
	}
	return nil
}

func (c *AgentCommand) skillsListUsage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s agent skills list", osutil.CurrentBin()),
		"",
		"List the Agent Skills distributed with this studioctl installation.",
	)
}

func (c *AgentCommand) runSkillsPath(args []string) error {
	if len(args) > 0 && isHelpArg(args[0]) {
		c.out.Print(c.skillsPathUsage())
		return nil
	}
	if len(args) != 1 {
		return fmt.Errorf(
			"%w: usage: %s agent skills path <name>",
			ErrMissingArgument,
			osutil.CurrentBin(),
		)
	}
	path, err := c.service.Path(args[0])
	if err != nil {
		return fmt.Errorf("resolve Agent Skill path: %w", err)
	}
	c.out.Println(path)
	return nil
}

func (c *AgentCommand) skillsPathUsage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s agent skills path <name>", osutil.CurrentBin()),
		"",
		"Print the canonical path to an Agent Skill installed with studioctl.",
	)
}

func (c *AgentCommand) runSkillsInstall(args []string) error {
	fs := flag.NewFlagSet("agent skills install", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	scope := fs.String("scope", agentskills.ScopeUser, "Installation scope: user or repo")
	harness := fs.String("harness", "", "Harness: codex or claude (auto-detected by default)")
	target := fs.String("target", "", "Explicit skills directory")
	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			c.out.Print(c.skillsInstallUsage())
			return nil
		}
		return fmt.Errorf("parsing flags: %w", err)
	}
	if fs.NArg() != 1 {
		return fmt.Errorf(
			"%w: usage: %s agent skills install [options] <name>",
			ErrMissingArgument,
			osutil.CurrentBin(),
		)
	}
	scopeSet := false
	fs.Visit(func(parsed *flag.Flag) {
		if parsed.Name == "scope" {
			scopeSet = true
		}
	})
	if *target != "" && (scopeSet || *harness != "") {
		return fmt.Errorf("%w: --target cannot be combined with --scope or --harness", ErrInvalidFlagValue)
	}
	workingDir, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("get current directory: %w", err)
	}

	results, err := c.service.Install(agentskills.InstallOptions{
		Name:       fs.Arg(0),
		Harness:    *harness,
		Scope:      *scope,
		TargetDir:  *target,
		WorkingDir: workingDir,
	})
	if err != nil {
		return fmt.Errorf("install Agent Skill: %w", err)
	}
	for _, result := range results {
		switch result.Status {
		case agentskills.InstallStatusInstalled:
			c.out.Successlnf("Installed %s skill at %s", result.Harness, result.Path)
		case agentskills.InstallStatusUpdated:
			c.out.Successlnf("Updated %s skill at %s", result.Harness, result.Path)
		case agentskills.InstallStatusUnchanged:
			c.out.Printlnf("Already up to date: %s", result.Path)
		}
	}
	return nil
}

func (c *AgentCommand) skillsInstallUsage() string {
	return joinLines(
		fmt.Sprintf("Usage: %s agent skills install [options] <name>", osutil.CurrentBin()),
		"",
		"Install a studioctl Agent Skill into a coding-agent harness discovery directory.",
		"Existing content at the skill path is replaced when it differs from the packaged skill.",
		"",
		"Options:",
		"  --scope user|repo              Install for the current user (default) or Git repository",
		"  --harness codex|claude         Select a harness instead of auto-detecting installed harnesses",
		"  --target DIR                    Install into an explicit skills directory (exclusive)",
		"  -h, --help                      Show this help",
		"",
		"Examples:",
		fmt.Sprintf("  %s agent skills install altinn-studio-app-development", osutil.CurrentBin()),
		fmt.Sprintf(
			"  %s agent skills install --scope repo --harness codex altinn-studio-app-development",
			osutil.CurrentBin(),
		),
		fmt.Sprintf(
			"  %s agent skills install --target ./my-harness/skills altinn-studio-app-development",
			osutil.CurrentBin(),
		),
	)
}

func isHelpArg(arg string) bool {
	return arg == "-h" || arg == flagHelp || arg == helpSubcmd
}

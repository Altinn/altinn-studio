package internal

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// BuildOptions configures a Go build.
type BuildOptions struct {
	Output  string
	Ldflags string
	Pkg     string
	Dir     string
	GOOS    string
	GOARCH  string
	CGO     bool
}

// GoBuildWithOptions runs `go build` with full control over build options.
func GoBuildWithOptions(ctx context.Context, opts BuildOptions) error {
	args := []string{"build"}
	if opts.Ldflags != "" {
		args = append(args, "-ldflags", opts.Ldflags)
	}
	args = append(args, "-o", opts.Output, opts.Pkg)

	cmd := exec.CommandContext(ctx, "go", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if opts.Dir != "" {
		cmd.Dir = opts.Dir
	}

	cmd.Env = buildGoEnv(os.Environ(), opts)

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("go build failed: %w", err)
	}
	return nil
}

func buildGoEnv(baseEnv []string, opts BuildOptions) []string {
	env := make([]string, 0, len(baseEnv)+3)
	for _, item := range baseEnv {
		if isOverriddenGoBuildSetting(item, opts) {
			continue
		}
		env = append(env, item)
	}
	if opts.GOOS != "" {
		env = append(env, "GOOS="+opts.GOOS)
	}
	if opts.GOARCH != "" {
		env = append(env, "GOARCH="+opts.GOARCH)
	}
	if opts.CGO {
		env = append(env, "CGO_ENABLED=1")
	} else {
		env = append(env, "CGO_ENABLED=0")
	}
	return env
}

func isOverriddenGoBuildSetting(item string, opts BuildOptions) bool {
	if strings.HasPrefix(item, "CGO_ENABLED=") {
		return true
	}
	if opts.GOOS != "" && strings.HasPrefix(item, "GOOS=") {
		return true
	}
	return opts.GOARCH != "" && strings.HasPrefix(item, "GOARCH=")
}

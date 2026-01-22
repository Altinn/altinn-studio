package internal

import (
	"context"
	"fmt"
	"os"
	"os/exec"
)

// BuildOptions configures a Go build.
type BuildOptions struct {
	Output  string
	Ldflags string
	Pkg     string
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

	// Set environment for cross-compilation
	env := os.Environ()
	if opts.GOOS != "" {
		env = append(env, "GOOS="+opts.GOOS)
	}
	if opts.GOARCH != "" {
		env = append(env, "GOARCH="+opts.GOARCH)
	}
	if !opts.CGO {
		env = append(env, "CGO_ENABLED=0")
	}
	cmd.Env = env

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("go build failed: %w", err)
	}
	return nil
}

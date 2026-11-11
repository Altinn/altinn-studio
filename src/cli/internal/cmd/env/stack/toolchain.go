package stack

import (
	"fmt"
	"os"
	"runtime"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/studioctl/internal/osutil"
)

// RuntimeUser decides how a container that reads or writes the developer's files runs on the detected
// toolchain: as the developer's uid:gid (empty on Windows, which has no uids and where Docker Desktop's file
// sharing makes mounts readable anyway), with podman keeping that uid inside the container, and with bind
// mounts relabelled where SELinux enforces. Every runtime's containers and an app container run the same way.
func RuntimeUser(toolchain types.ContainerToolchain) (user, usernsMode string, relabelBinds bool) {
	if runtime.GOOS != osutil.OSWindows {
		user = fmt.Sprintf("%d:%d", os.Getuid(), os.Getgid())
	}
	if toolchain.Platform == types.PlatformPodman {
		usernsMode = "keep-id"
		relabelBinds = toolchain.SELinux
	}
	return user, usernsMode, relabelBinds
}

// Package embedded provides embedded configuration files for localtest infrastructure.
package embedded

import "embed"

// Files contains embedded configuration files for infrastructure services.
//
//go:embed postgres-init.sql pgadmin-servers.json
var Files embed.FS

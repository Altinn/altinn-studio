package proxy

import "strings"

// services are the platform's APIs, by the first segment of their path. They are the hosts' paths in the
// PlatformSettings and EFormidlingClientSettings endpoints of the runtime app config.
var services = map[string]bool{
	"accessmanagement": true,
	"authentication":   true,
	"authorization":    true,
	"correspondence":   true,
	"eformidling":      true,
	"events":           true,
	"notifications":    true,
	"profile":          true,
	"register":         true,
	"storage":          true,
}

// otherRoute is the route of a request to a path outside the known APIs. The proxy forwards it all the same.
const otherRoute = "/*"

// Route returns the route a request to path has on spans and metrics: which of the platform's APIs it is
// for, such as /storage/*. It never holds more of the path, which can hold a national identity number and
// has too many values for a metric.
func Route(path string) string {
	segment, _, _ := strings.Cut(strings.TrimPrefix(path, "/"), "/")
	if services[segment] {
		return "/" + segment + "/*"
	}
	return otherRoute
}

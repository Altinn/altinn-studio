package manifest

import (
	"errors"
	"fmt"
	"maps"
	"regexp"
	"slices"
	"strconv"
	"strings"
)

// The public origin. The manifest's public section names the default host and port of the origin every browser, app and
// test reaches, and the dedicated subdomains the front door serves on the same port (pdf.<host>, …). The envs values
// name the origin through a small, fixed set of placeholders, resolved for one host and port:
//
//	{{origin}}        http://<host>:<port>
//	{{host}}          <host>
//	{{port}}          <port>
//	{{origin:<sub>}}  http://<sub>.<host>:<port>, for a listed subdomain
//	{{host:<sub>}}    <sub>.<host>, for a listed subdomain
//
// Nothing else in a value is substituted; Parse refuses any other {{…}}.
const (
	// Scheme is the public origin's scheme.
	Scheme = "http"

	placeholderOrigin = "origin"
	placeholderHost   = "host"
	placeholderPort   = "port"
	placeholderOpen   = "{{"
)

var (
	errPlaceholder = errors.New("bad placeholder")
	errHost        = errors.New("bad host name")

	// placeholder matches one {{name}} or {{name:subdomain}}; the name and subdomain are checked after the match.
	placeholder = regexp.MustCompile(`\{\{([^{}]*)\}\}`)
	// hostLabel is one label of a host name: lower-case letters, digits and inner hyphens.
	hostLabel = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`)
)

// Public is the manifest's public section: the default host and port of the public origin and the dedicated
// subdomains, in file order.
type Public struct {
	Host       string   `json:"host"`
	Subdomains []string `json:"subdomains"`
	Port       int      `json:"port"`
}

// Origin is the public origin of one environment: its host and port, and the manifest's dedicated subdomains.
type Origin struct {
	Host       string
	Subdomains []string
	Port       int
}

// Origin is the public origin at host and port with the manifest's subdomains; an empty host or a zero port is the
// manifest's default.
func (m *Manifest) Origin(host string, port int) Origin {
	if host == "" {
		host = m.Public.Host
	}
	if port == 0 {
		port = m.Public.Port
	}
	return Origin{Host: host, Port: port, Subdomains: slices.Clone(m.Public.Subdomains)}
}

// DefaultOrigin is the public origin at the manifest's default host and port.
func (m *Manifest) DefaultOrigin() Origin {
	return m.Origin("", 0)
}

// URL is the origin without a trailing slash: http://<host>:<port>.
func (o Origin) URL() string {
	return Scheme + "://" + o.Host + ":" + strconv.Itoa(o.Port)
}

// SubdomainHost is a dedicated subdomain's host name: <sub>.<host>.
func (o Origin) SubdomainHost(sub string) string {
	return sub + "." + o.Host
}

// SubdomainURL is a dedicated subdomain's origin: http://<sub>.<host>:<port>.
func (o Origin) SubdomainURL(sub string) string {
	return Scheme + "://" + o.SubdomainHost(sub) + ":" + strconv.Itoa(o.Port)
}

// Hosts are the host names that must reach the origin: the host, then each subdomain's in file order.
func (o Origin) Hosts() []string {
	hosts := make([]string, 0, 1+len(o.Subdomains))
	hosts = append(hosts, o.Host)
	for _, sub := range o.Subdomains {
		hosts = append(hosts, o.SubdomainHost(sub))
	}
	return hosts
}

// Resolve replaces the placeholders in value; Parse has checked them.
func (o Origin) Resolve(value string) string {
	return placeholder.ReplaceAllStringFunc(value, func(match string) string {
		resolved, err := o.resolveOne(match[2 : len(match)-2])
		if err != nil {
			// Parse refuses a value with a bad placeholder, so only a value that was not in the manifest gets here.
			return match
		}
		return resolved
	})
}

// Envs are a container's envs with the placeholders resolved for the origin.
func (m *Manifest) Envs(name string, o Origin) map[string]string {
	envs := m.Containers[name].Envs
	if envs == nil {
		return nil
	}
	out := make(map[string]string, len(envs))
	for key, value := range envs {
		out[key] = o.Resolve(value)
	}
	return out
}

func (o Origin) resolveOne(inner string) (string, error) {
	name, sub, hasSub := strings.Cut(inner, ":")
	if hasSub {
		if !slices.Contains(o.Subdomains, sub) {
			return "", fmt.Errorf("%w {{%s}}: %q is not a listed subdomain (%s)",
				errPlaceholder, inner, sub, strings.Join(o.Subdomains, ", "))
		}
		switch name {
		case placeholderOrigin:
			return o.SubdomainURL(sub), nil
		case placeholderHost:
			return o.SubdomainHost(sub), nil
		}
		return "", fmt.Errorf("%w {{%s}}: only origin and host take a subdomain", errPlaceholder, inner)
	}
	switch name {
	case placeholderOrigin:
		return o.URL(), nil
	case placeholderHost:
		return o.Host, nil
	case placeholderPort:
		return strconv.Itoa(o.Port), nil
	}
	return "", fmt.Errorf("%w {{%s}}: one of {{origin}}, {{host}}, {{port}}, {{origin:<sub>}}, {{host:<sub>}}",
		errPlaceholder, inner)
}

// checkPlaceholders refuses a value whose {{…}} is not one of the placeholders, or names a subdomain the public section
// does not list.
func (o Origin) checkPlaceholders(value string) error {
	if strings.Count(value, placeholderOpen) != len(placeholder.FindAllStringIndex(value, -1)) {
		return fmt.Errorf("%w in %q: an unclosed {{", errPlaceholder, value)
	}
	for _, match := range placeholder.FindAllStringSubmatch(value, -1) {
		if _, err := o.resolveOne(match[1]); err != nil {
			return err
		}
	}
	return nil
}

// CheckHost refuses a host name that cannot be the public origin's: lower-case letters, digits and hyphens in
// dot-separated labels, at most 253 characters, no IP address.
func CheckHost(host string) error {
	const maxHost = 253
	if host == "" || len(host) > maxHost {
		return fmt.Errorf("%w %q", errHost, host)
	}
	labels := strings.Split(host, ".")
	for _, label := range labels {
		if !hostLabel.MatchString(label) {
			return fmt.Errorf("%w %q: lower-case letters, digits and hyphens in dot-separated labels", errHost, host)
		}
	}
	if _, err := strconv.Atoi(labels[len(labels)-1]); err == nil {
		return fmt.Errorf("%w %q: a name, not an IP address", errHost, host)
	}
	return nil
}

// CheckPort refuses a port that cannot be published: 1 to 65535.
func CheckPort(port int) error {
	if port < 1 || port > maxPort {
		return fmt.Errorf("%w: port %d", errValue, port)
	}
	return nil
}

func (m *Manifest) checkPublic() error {
	p := m.Public
	if err := CheckHost(p.Host); err != nil {
		return fmt.Errorf("public: %w", err)
	}
	if err := CheckPort(p.Port); err != nil {
		return fmt.Errorf("public: %w", err)
	}
	seen := map[string]bool{}
	for _, sub := range p.Subdomains {
		if !hostLabel.MatchString(sub) {
			return fmt.Errorf("public: %w: subdomain %q", errValue, sub)
		}
		if seen[sub] {
			return fmt.Errorf("public: %w subdomain %s", errDuplicate, sub)
		}
		seen[sub] = true
	}
	origin := m.DefaultOrigin()
	for _, name := range m.names {
		envs := m.Containers[name].Envs
		for _, key := range slices.Sorted(maps.Keys(envs)) {
			if err := origin.checkPlaceholders(envs[key]); err != nil {
				return fmt.Errorf("container %s: envs %s: %w", name, key, err)
			}
		}
	}
	return nil
}

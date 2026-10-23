package localtestv2

import (
	"errors"
	"fmt"
	"slices"
	"strings"

	"altinn.studio/studioctl/internal/localtestv2/manifest"
)

// GroupEverything is the --with value that starts every optional group.
const GroupEverything = "everything"

var (
	errUnknownGroup = errors.New("unknown group")
	errDefaultGroup = errors.New("the " + manifest.DefaultGroup + " group is always on")
)

// OptionalGroups lists the manifest's groups other than the default one, in manifest order.
func OptionalGroups() []string {
	var names []string
	for _, name := range stack().GroupNames() {
		if name != manifest.DefaultGroup {
			names = append(names, name)
		}
	}
	return names
}

// GroupNames lists the values --with and --without take: the optional groups and everything.
func GroupNames() []string {
	return append(OptionalGroups(), GroupEverything)
}

// ResolveGroups turns --with and --without into the optional groups that are on, sorted: the groups named by --with
// (everything names them all), less those named by --without. A group starts its root containers and what they depend
// on, so --without leaves out a group's own roots only: a container another enabled group depends on still starts.
func ResolveGroups(with, without []string) ([]string, error) {
	optional := OptionalGroups()
	expand := func(name string) ([]string, error) {
		switch {
		case name == GroupEverything:
			return optional, nil
		case name == manifest.DefaultGroup:
			return nil, errDefaultGroup
		case slices.Contains(optional, name):
			return []string{name}, nil
		}
		return nil, fmt.Errorf("%w: %s (one of %s)", errUnknownGroup, name, strings.Join(GroupNames(), ", "))
	}
	enabled := map[string]bool{}
	for _, name := range with {
		names, err := expand(name)
		if err != nil {
			return nil, err
		}
		for _, n := range names {
			enabled[n] = true
		}
	}
	for _, name := range without {
		names, err := expand(name)
		if err != nil {
			return nil, err
		}
		for _, n := range names {
			delete(enabled, n)
		}
	}
	var out []string
	for _, name := range optional {
		if enabled[name] {
			out = append(out, name)
		}
	}
	slices.Sort(out)
	return out, nil
}

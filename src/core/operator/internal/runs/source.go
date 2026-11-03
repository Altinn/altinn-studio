package runs

import (
	"fmt"
	"regexp"
	"strings"
)

// maxSourceName is the longest name of a source, as Name in api/openapi.yaml.
const maxSourceName = 100

var (
	sourceNamePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]*$`)
	commitPattern     = regexp.MustCompile(`^([0-9a-f]{40}|[0-9a-f]{64})$`)
)

// Source is Source in api/openapi.yaml: what a run is for. The run's workflow has each field as a label, so a caller
// finds its runs again by them, and a dashboard can count runs by org.
type Source struct {
	Org       string `json:"org"`
	App       string `json:"app"`
	RepoOwner string `json:"repoOwner"`
	Repo      string `json:"repo"`
	Commit    string `json:"commit"`
}

// normalized gives the source in lowercase, so names that Gitea compares without case are the same labels.
func (s Source) normalized() Source {
	return Source{
		Org:       strings.ToLower(s.Org),
		App:       strings.ToLower(s.App),
		RepoOwner: strings.ToLower(s.RepoOwner),
		Repo:      strings.ToLower(s.Repo),
		Commit:    strings.ToLower(s.Commit),
	}
}

// check refuses a source that is not valid. It expects a normalized source.
func (s Source) check() error {
	for _, field := range []struct{ name, value string }{
		{"org", s.Org}, {"app", s.App}, {"repoOwner", s.RepoOwner}, {"repo", s.Repo},
	} {
		if err := checkSourceName("source."+field.name, field.value); err != nil {
			return err
		}
	}
	return checkCommit("source.commit", s.Commit)
}

func checkSourceName(name, value string) error {
	if len(value) > maxSourceName || !sourceNamePattern.MatchString(value) {
		return &RequestError{Message: fmt.Sprintf(
			"%s must be a name of letters, digits, '.', '_' and '-' of at most %d characters.",
			name, maxSourceName)}
	}
	return nil
}

func checkCommit(name, value string) error {
	if !commitPattern.MatchString(value) {
		return &RequestError{
			Message: name + " must be a full commit id in hexadecimal, of 40 or 64 characters.",
		}
	}
	return nil
}

// labels are the source's labels on the run's workflow.
func (s Source) labels() map[string]string {
	return map[string]string{
		workflowLabelOrg:       s.Org,
		workflowLabelApp:       s.App,
		workflowLabelRepoOwner: s.RepoOwner,
		workflowLabelRepo:      s.Repo,
		workflowLabelCommit:    s.Commit,
	}
}

// sourceOf reads a run's source from the labels of its workflow.
func sourceOf(labels map[string]string) Source {
	return Source{
		Org:       labels[workflowLabelOrg],
		App:       labels[workflowLabelApp],
		RepoOwner: labels[workflowLabelRepoOwner],
		Repo:      labels[workflowLabelRepo],
		Commit:    labels[workflowLabelCommit],
	}
}

// Filter is the query of a find: the source fields and the kind that a run must have. Empty fields match any run.
type Filter struct {
	Source

	Kind string
}

// labels are the workflow labels that the filter asks for. It checks each field that is set.
func (f Filter) labels() (map[string]string, error) {
	source := f.normalized()
	labels := map[string]string{}
	for _, field := range []struct{ name, label, value string }{
		{"org", workflowLabelOrg, source.Org},
		{"app", workflowLabelApp, source.App},
		{"repoOwner", workflowLabelRepoOwner, source.RepoOwner},
		{"repo", workflowLabelRepo, source.Repo},
	} {
		if field.value == "" {
			continue
		}
		if err := checkSourceName(field.name, field.value); err != nil {
			return nil, err
		}
		labels[field.label] = field.value
	}
	if source.Commit != "" {
		if err := checkCommit("commit", source.Commit); err != nil {
			return nil, err
		}
		labels[workflowLabelCommit] = source.Commit
	}
	if f.Kind != "" {
		labels[workflowLabelKind] = f.Kind
	}
	if len(labels) == 0 {
		return nil, &RequestError{Message: "Find runs by at least one of org, app, repoOwner, repo, commit and kind."}
	}
	return labels, nil
}

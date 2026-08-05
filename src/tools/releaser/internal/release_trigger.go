package internal

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

var (
	errReleaseTriggerEvent             = errors.New("unsupported release trigger event")
	errReleaseTriggerBranchRequired    = errors.New("release trigger must run from a branch")
	errReleaseTriggerRefRequired       = errors.New("release trigger ref is required")
	errReleaseTriggerSHARequired       = errors.New("release trigger commit SHA is required")
	errReleaseTriggerBeforeRequired    = errors.New("release trigger before SHA is required")
	errReleaseTriggerReaderRequired    = errors.New("release trigger pull request reader is required")
	errReleaseTriggerValidatorRequired = errors.New("release trigger validator is required")
	errReleaseTriggerLabelCount        = errors.New("release pull request must have exactly one release label")
	errReleaseTriggerPullRequestCount  = errors.New("multiple release pull requests are associated with the commit")
)

// ReleaseTriggerRequest describes a canonical repository event that may start a release.
type ReleaseTriggerRequest struct {
	EventName         string
	RefName           string
	RefType           string
	SHA               string
	BeforeSHA         string
	SelectedComponent string
}

// ReleaseTriggerResult is the trusted release context emitted to CI.
type ReleaseTriggerResult struct {
	Component         string `json:"component"`
	BaseBranch        string `json:"baseBranch"`
	MergeSHA          string `json:"mergeSha"`
	PullRequestNumber string `json:"pullRequestNumber"`
}

type releaseTriggerPullRequest struct {
	MergedAt string                           `json:"merged_at"` //nolint:tagliatelle // GitHub API field name.
	Base     releaseTriggerPullRequestBase    `json:"base"`
	Labels   []releaseTriggerPullRequestLabel `json:"labels"`
	Number   int                              `json:"number"`
}

type releaseTriggerPullRequestBase struct {
	Ref string `json:"ref"`
}

type releaseTriggerPullRequestLabel struct {
	Name string `json:"name"`
}

type releaseTriggerPullRequestReader interface {
	pullRequestsForCommit(ctx context.Context, sha string) ([]releaseTriggerPullRequest, error)
}

type releaseTriggerValidator func(context.Context, string, string, string) error

// ResolveReleaseTrigger resolves a trusted push or manual recovery event.
func ResolveReleaseTrigger(ctx context.Context, req ReleaseTriggerRequest) (ReleaseTriggerResult, error) {
	git := NewGitCLI(WithLogger(NopLogger{}))
	gh := NewGitHubCLI(WithGHLogger(NopLogger{}))
	validate := func(validationCtx context.Context, component, base, head string) error {
		return RunValidationWithDeps(validationCtx, ValidationRequest{
			Component:     component,
			Base:          base,
			Head:          head,
			ChangelogPath: "",
		}, git)
	}

	return resolveReleaseTriggerWithDeps(ctx, req, gh, validate)
}

func resolveReleaseTriggerWithDeps(
	ctx context.Context,
	req ReleaseTriggerRequest,
	reader releaseTriggerPullRequestReader,
	validate releaseTriggerValidator,
) (ReleaseTriggerResult, error) {
	if ctx == nil {
		return ReleaseTriggerResult{}, errContextRequired
	}
	if req.RefName == "" {
		return ReleaseTriggerResult{}, errReleaseTriggerRefRequired
	}
	if req.SHA == "" {
		return ReleaseTriggerResult{}, errReleaseTriggerSHARequired
	}
	if req.RefType != "branch" {
		return ReleaseTriggerResult{}, errReleaseTriggerBranchRequired
	}

	result := ReleaseTriggerResult{
		Component:         "",
		BaseBranch:        req.RefName,
		MergeSHA:          req.SHA,
		PullRequestNumber: "",
	}
	switch req.EventName {
	case "workflow_dispatch":
		if err := validateReleaseTriggerComponent(req.SelectedComponent, req.RefName); err != nil {
			return ReleaseTriggerResult{}, err
		}
		result.Component = req.SelectedComponent
		return result, nil
	case "push":
		return resolvePushReleaseTrigger(ctx, req, result, reader, validate)
	default:
		return ReleaseTriggerResult{}, fmt.Errorf("%w: %s", errReleaseTriggerEvent, req.EventName)
	}
}

func resolvePushReleaseTrigger(
	ctx context.Context,
	req ReleaseTriggerRequest,
	result ReleaseTriggerResult,
	reader releaseTriggerPullRequestReader,
	validate releaseTriggerValidator,
) (ReleaseTriggerResult, error) {
	if reader == nil {
		return ReleaseTriggerResult{}, errReleaseTriggerReaderRequired
	}
	pullRequests, err := reader.pullRequestsForCommit(ctx, req.SHA)
	if err != nil {
		return ReleaseTriggerResult{}, fmt.Errorf("list pull requests for commit: %w", err)
	}

	var candidate releaseTriggerPullRequest
	var candidateComponents []string
	candidateFound := false
	for _, pullRequest := range pullRequests {
		if pullRequest.MergedAt == "" || pullRequest.Base.Ref != req.RefName {
			continue
		}
		components := releaseTriggerComponents(pullRequest.Labels)
		if len(components) == 0 {
			continue
		}
		if candidateFound {
			return ReleaseTriggerResult{}, errReleaseTriggerPullRequestCount
		}
		candidate = pullRequest
		candidateComponents = components
		candidateFound = true
	}

	if !candidateFound {
		return result, nil
	}
	if len(candidateComponents) != 1 {
		return ReleaseTriggerResult{}, errReleaseTriggerLabelCount
	}

	component := candidateComponents[0]
	if err := validateReleaseTriggerComponent(component, req.RefName); err != nil {
		return ReleaseTriggerResult{}, err
	}
	if req.BeforeSHA == "" {
		return ReleaseTriggerResult{}, errReleaseTriggerBeforeRequired
	}
	if validate == nil {
		return ReleaseTriggerResult{}, errReleaseTriggerValidatorRequired
	}
	if err := validate(ctx, component, req.BeforeSHA, req.SHA); err != nil {
		return ReleaseTriggerResult{}, fmt.Errorf("validate release trigger changelog: %w", err)
	}

	result.Component = component
	result.PullRequestNumber = strconv.Itoa(candidate.Number)
	return result, nil
}

func releaseTriggerComponents(labels []releaseTriggerPullRequestLabel) []string {
	var components []string
	for _, label := range labels {
		component, found := strings.CutPrefix(label.Name, "release/")
		if !found {
			continue
		}
		components = append(components, component)
	}
	return components
}

func validateReleaseTriggerComponent(component, baseBranch string) error {
	registered, err := GetComponent(component)
	if err != nil {
		return fmt.Errorf("get release trigger component: %w", err)
	}
	if _, err := parseBaseBranchSelector(registered.Name, baseBranch); err != nil {
		return fmt.Errorf("validate release trigger branch: %w", err)
	}
	return nil
}

func (g *GitHubCLI) pullRequestsForCommit(
	ctx context.Context,
	sha string,
) ([]releaseTriggerPullRequest, error) {
	endpoint := fmt.Sprintf(
		"repos/%s/commits/%s/pulls?per_page=100",
		canonicalRepositoryName,
		url.PathEscape(sha),
	)
	output, err := g.runRead(ctx, "api", "--paginate", "--slurp", endpoint)
	if err != nil {
		return nil, err
	}
	return parseReleaseTriggerPullRequestPages(output)
}

func parseReleaseTriggerPullRequestPages(output string) ([]releaseTriggerPullRequest, error) {
	var pages [][]releaseTriggerPullRequest
	if err := json.Unmarshal([]byte(output), &pages); err != nil {
		return nil, fmt.Errorf("decode pull requests for commit: %w", err)
	}

	var pullRequests []releaseTriggerPullRequest
	for _, page := range pages {
		pullRequests = append(pullRequests, page...)
	}
	return pullRequests, nil
}

package internal

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
)

var (
	errReleaseTriggerEvent          = errors.New("unsupported release trigger event")
	errReleaseTriggerBranchRequired = errors.New("release trigger must run from a branch")
	errReleaseTriggerRefRequired    = errors.New("release trigger ref is required")
	errReleaseTriggerSHARequired    = errors.New("release trigger commit SHA is required")
	errReleaseTriggerBeforeRequired = errors.New("release trigger before SHA is required")
	errReleaseTriggerPromotionCount = errors.New(
		"push contains release promotions for multiple components",
	)
)

// ReleaseTriggerRequest describes a canonical repository event that may start a release.
type ReleaseTriggerRequest struct {
	EventName         string
	RefName           string
	RefType           string
	Commit            string
	BeforeSHA         string
	SelectedComponent string
}

// ReleasePlan is the immutable release context emitted to CI.
type ReleasePlan struct {
	Component      string `json:"component"`
	BaseBranch     string `json:"baseBranch"`
	Commit         string `json:"commit"`
	ReleaseVersion string `json:"releaseVersion"`
}

// ReleaseTriggerResult either contains one complete release plan or represents a no-op.
type ReleaseTriggerResult struct {
	Release *ReleasePlan `json:"release"`
}

type releaseTriggerPromotion struct {
	component string
	version   string
}

type gitReader interface {
	Run(ctx context.Context, args ...string) (string, error)
}

// ResolveReleaseTrigger resolves a trusted push or manual recovery event.
func ResolveReleaseTrigger(ctx context.Context, req ReleaseTriggerRequest) (ReleaseTriggerResult, error) {
	git := NewGitCLI(WithLogger(NopLogger{}))
	return resolveReleaseTriggerWithDeps(ctx, req, git)
}

func resolveReleaseTriggerWithDeps(
	ctx context.Context,
	req ReleaseTriggerRequest,
	git gitReader,
) (ReleaseTriggerResult, error) {
	if ctx == nil {
		return ReleaseTriggerResult{}, errContextRequired
	}
	if req.RefName == "" {
		return ReleaseTriggerResult{}, errReleaseTriggerRefRequired
	}
	if req.Commit == "" {
		return ReleaseTriggerResult{}, errReleaseTriggerSHARequired
	}
	if req.RefType != "branch" {
		return ReleaseTriggerResult{}, errReleaseTriggerBranchRequired
	}

	switch req.EventName {
	case "workflow_dispatch":
		component, err := validateReleaseTriggerComponent(req.SelectedComponent, req.RefName)
		if err != nil {
			return ReleaseTriggerResult{}, err
		}
		if git == nil {
			return ReleaseTriggerResult{}, errGitRequired
		}
		cl, err := loadChangelogAtRef(ctx, git, req.Commit, component.ChangelogPath)
		if err != nil {
			return ReleaseTriggerResult{}, fmt.Errorf("load %s changelog at %s: %w", component.Name, req.Commit, err)
		}
		resolvedVersion, err := resolveWorkflowVersionFromChangelog(component, req.RefName, cl)
		if err != nil {
			return ReleaseTriggerResult{}, fmt.Errorf("resolve manual release version: %w", err)
		}
		return releaseTriggerResult(component.Name, req.RefName, req.Commit, resolvedVersion), nil
	case "push":
		return resolvePushReleaseTrigger(ctx, req, git)
	default:
		return ReleaseTriggerResult{}, fmt.Errorf("%w: %s", errReleaseTriggerEvent, req.EventName)
	}
}

func resolvePushReleaseTrigger(
	ctx context.Context,
	req ReleaseTriggerRequest,
	git gitReader,
) (ReleaseTriggerResult, error) {
	if req.BeforeSHA == "" {
		return ReleaseTriggerResult{}, errReleaseTriggerBeforeRequired
	}
	if isZeroCommit(req.BeforeSHA) || isZeroCommit(req.Commit) {
		return ReleaseTriggerResult{}, nil
	}
	if git == nil {
		return ReleaseTriggerResult{}, errGitRequired
	}

	changedOutput, err := git.Run(ctx, releaseTriggerDiffArgs(req.BeforeSHA, req.Commit)...)
	if err != nil {
		return ReleaseTriggerResult{}, fmt.Errorf("list changed files: %w", err)
	}
	changedFiles := changedFileSet(changedOutput)
	promotedComponents, err := releaseTriggerPromotions(ctx, req, git, changedFiles)
	if err != nil {
		return ReleaseTriggerResult{}, err
	}

	switch len(promotedComponents) {
	case 0:
		return ReleaseTriggerResult{}, nil
	case 1:
		promotion := promotedComponents[0]
		if _, err := validateReleaseTriggerComponent(promotion.component, req.RefName); err != nil {
			return ReleaseTriggerResult{}, err
		}
		return releaseTriggerResult(promotion.component, req.RefName, req.Commit, promotion.version), nil
	default:
		return ReleaseTriggerResult{}, fmt.Errorf(
			"%w: %s",
			errReleaseTriggerPromotionCount,
			promotionComponentNames(promotedComponents),
		)
	}
}

func releaseTriggerPromotions(
	ctx context.Context,
	req ReleaseTriggerRequest,
	git gitReader,
	changedFiles map[string]struct{},
) ([]releaseTriggerPromotion, error) {
	componentNames := make([]string, 0, len(components))
	for name := range components {
		componentNames = append(componentNames, name)
	}
	sort.Strings(componentNames)

	promotedComponents := make([]releaseTriggerPromotion, 0, 1)
	for _, name := range componentNames {
		component := components[name]
		if !component.HasReleasePublisher {
			continue
		}
		if _, changed := changedFiles[component.ChangelogPath]; !changed {
			continue
		}

		baseChangelog, loadErr := loadChangelogAtRef(ctx, git, req.BeforeSHA, component.ChangelogPath)
		if loadErr != nil {
			return nil, fmt.Errorf(
				"load %s changelog at %s: %w",
				name,
				req.BeforeSHA,
				loadErr,
			)
		}
		headChangelog, loadErr := loadChangelogAtRef(ctx, git, req.Commit, component.ChangelogPath)
		if loadErr != nil {
			return nil, fmt.Errorf(
				"load %s changelog at %s: %w",
				name,
				req.Commit,
				loadErr,
			)
		}

		version, classifyErr := classifyChangelogChange(baseChangelog, headChangelog)
		if classifyErr != nil {
			return nil, fmt.Errorf("validate %s changelog change: %w", name, classifyErr)
		}
		if version != "" {
			promotedComponents = append(promotedComponents, releaseTriggerPromotion{
				component: name,
				version:   version,
			})
		}
	}

	return promotedComponents, nil
}

func promotionComponentNames(promotions []releaseTriggerPromotion) string {
	names := make([]string, 0, len(promotions))
	for _, promotion := range promotions {
		names = append(names, promotion.component)
	}
	return strings.Join(names, ", ")
}

func isZeroCommit(sha string) bool {
	return strings.Trim(sha, "0") == ""
}

func releaseTriggerDiffArgs(base, head string) []string {
	return []string{"diff", "--name-only", "--no-renames", base, head, "--"}
}

func changedFileSet(output string) map[string]struct{} {
	files := make(map[string]struct{})
	for line := range strings.SplitSeq(output, "\n") {
		if path := strings.TrimSpace(line); path != "" {
			files[path] = struct{}{}
		}
	}
	return files
}

func releaseTriggerResult(component, baseBranch, commit, releaseVersion string) ReleaseTriggerResult {
	return ReleaseTriggerResult{Release: &ReleasePlan{
		Component:      component,
		BaseBranch:     baseBranch,
		Commit:         commit,
		ReleaseVersion: releaseVersion,
	}}
}

func validateReleaseTriggerComponent(component, baseBranch string) (*Component, error) {
	registered, err := GetComponent(component)
	if err != nil {
		return nil, fmt.Errorf("get release trigger component: %w", err)
	}
	if _, err := parseBaseBranchSelector(registered.Name, baseBranch); err != nil {
		return nil, fmt.Errorf("validate release trigger branch: %w", err)
	}
	return registered, nil
}

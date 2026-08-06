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
	SHA               string
	BeforeSHA         string
	SelectedComponent string
}

// ReleaseTriggerResult is the trusted release context emitted to CI.
type ReleaseTriggerResult struct {
	Component      string `json:"component"`
	BaseBranch     string `json:"baseBranch"`
	MergeSHA       string `json:"mergeSha"`
	ReleaseVersion string `json:"releaseVersion"`
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
	if req.SHA == "" {
		return ReleaseTriggerResult{}, errReleaseTriggerSHARequired
	}
	if req.RefType != "branch" {
		return ReleaseTriggerResult{}, errReleaseTriggerBranchRequired
	}

	result := ReleaseTriggerResult{
		Component:      "",
		BaseBranch:     req.RefName,
		MergeSHA:       req.SHA,
		ReleaseVersion: "",
	}
	switch req.EventName {
	case "workflow_dispatch":
		if err := validateReleaseTriggerComponent(req.SelectedComponent, req.RefName); err != nil {
			return ReleaseTriggerResult{}, err
		}
		result.Component = req.SelectedComponent
		return result, nil
	case "push":
		return resolvePushReleaseTrigger(ctx, req, result, git)
	default:
		return ReleaseTriggerResult{}, fmt.Errorf("%w: %s", errReleaseTriggerEvent, req.EventName)
	}
}

func resolvePushReleaseTrigger(
	ctx context.Context,
	req ReleaseTriggerRequest,
	result ReleaseTriggerResult,
	git gitReader,
) (ReleaseTriggerResult, error) {
	if req.BeforeSHA == "" {
		return ReleaseTriggerResult{}, errReleaseTriggerBeforeRequired
	}
	if isZeroCommit(req.BeforeSHA) || isZeroCommit(req.SHA) {
		return result, nil
	}
	if git == nil {
		return ReleaseTriggerResult{}, errGitRequired
	}

	changedOutput, err := git.Run(ctx, releaseTriggerDiffArgs(req.BeforeSHA, req.SHA)...)
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
		return result, nil
	case 1:
		promotion := promotedComponents[0]
		if err := validateReleaseTriggerComponent(promotion.component, req.RefName); err != nil {
			return ReleaseTriggerResult{}, err
		}
		result.Component = promotion.component
		result.ReleaseVersion = promotion.version
		return result, nil
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
		headChangelog, loadErr := loadChangelogAtRef(ctx, git, req.SHA, component.ChangelogPath)
		if loadErr != nil {
			return nil, fmt.Errorf(
				"load %s changelog at %s: %w",
				name,
				req.SHA,
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

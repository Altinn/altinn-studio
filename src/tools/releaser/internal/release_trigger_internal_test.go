package internal

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
)

const (
	triggerBeforeSHA = "abcdef0123456789"
	triggerHeadSHA   = "0123456789abcdef"
	triggerVersion   = "v1.0.0"

	triggerBaseChangelog = `# Changelog

## [Unreleased]

### Added

- Release me
`
	triggerPromotedChangelog = `# Changelog

## [Unreleased]

## [1.0.0] - 2026-08-06

### Added

- Release me
`
	triggerPromotedWithNewEntry = `# Changelog

## [Unreleased]

### Fixed

- Arrived after the promotion

## [1.0.0] - 2026-08-06

### Added

- Release me
`
	triggerOrdinaryChangelog = `# Changelog

## [Unreleased]

### Added

- Release me
- Another change
`
	triggerInvalidPromotion = `# Changelog

## [Unreleased]

## [1.0.0] - 2026-08-06

### Added

- Something else
`
	triggerMultiplePromotions = `# Changelog

## [Unreleased]

## [2.0.0] - 2026-08-06

### Added

- Something else

## [1.0.0] - 2026-08-05

### Added

- Release me
`
	triggerPartialBaseChangelog = `# Changelog

## [Unreleased]

### Added

- Release me
- Leave me behind
`
	triggerPartialPromotion = `# Changelog

## [Unreleased]

### Added

- Leave me behind

## [1.0.0] - 2026-08-06

### Added

- Release me
`
	triggerStabilizationBase = `# Changelog

## [Unreleased]

## [1.0.0-preview.2] - 2026-08-05

### Fixed

- Critical bugfix

## [1.0.0-preview.1] - 2026-08-04

### Added

- First stable feature
`
	triggerStabilizedChangelog = `# Changelog

## [Unreleased]

## [1.0.0] - 2026-08-06

### Added

- First stable feature

### Fixed

- Critical bugfix

## [1.0.0-preview.2] - 2026-08-05

### Fixed

- Critical bugfix

## [1.0.0-preview.1] - 2026-08-04

### Added

- First stable feature
`
)

var (
	errTriggerGit           = errors.New("trigger git failed")
	errTriggerMissingHead   = errors.New("trigger changelog missing at head")
	errUnexpectedTriggerGit = errors.New("unexpected trigger git command")
)

type triggerChangelogPair struct {
	headErr error
	base    string
	head    string
}

type fakeReleaseTriggerGit struct {
	outputs     map[string]string
	commandErrs map[string]error
	err         error
}

func (f fakeReleaseTriggerGit) Run(_ context.Context, args ...string) (string, error) {
	if f.err != nil {
		return "", f.err
	}
	key := strings.Join(args, " ")
	if err, found := f.commandErrs[key]; found {
		return "", err
	}
	output, found := f.outputs[key]
	if !found {
		return "", fmt.Errorf("%w: %s", errUnexpectedTriggerGit, key)
	}
	return output, nil
}

func TestResolveReleaseTriggerManual(t *testing.T) {
	t.Parallel()

	tests := []struct {
		wantErr   error
		name      string
		component string
		refName   string
		refType   string
	}{
		{name: "app from main", component: "app", refName: "main", refType: "branch"},
		{
			name:      "studioctl from release branch",
			component: "studioctl",
			refName:   "release/studioctl/v1.2",
			refType:   "branch",
		},
		{
			name:      "studioctl from zero-major release branch",
			component: "studioctl",
			refName:   "release/studioctl/v0.1",
			refType:   "branch",
		},
		{
			name:      "component does not match release branch",
			component: "app",
			refName:   "release/studioctl/v1.2",
			refType:   "branch",
			wantErr:   errBaseBranchMismatch,
		},
		{
			name:      "non-canonical release branch is rejected",
			component: "app",
			refName:   "release/app/v01.02",
			refType:   "branch",
			wantErr:   errBaseBranchFormat,
		},
		{
			name:      "tags are rejected",
			component: "app",
			refName:   "app/v9.0.0",
			refType:   "tag",
			wantErr:   errReleaseTriggerBranchRequired,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got, err := resolveReleaseTriggerWithDeps(t.Context(), ReleaseTriggerRequest{
				EventName:         "workflow_dispatch",
				RefName:           tc.refName,
				RefType:           tc.refType,
				SHA:               triggerHeadSHA,
				SelectedComponent: tc.component,
			}, nil)
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("resolveReleaseTriggerWithDeps() error = %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("resolveReleaseTriggerWithDeps() error = %v", err)
			}
			want := ReleaseTriggerResult{
				Component:  tc.component,
				BaseBranch: tc.refName,
				MergeSHA:   triggerHeadSHA,
			}
			if got != want {
				t.Fatalf("resolveReleaseTriggerWithDeps() = %+v, want %+v", got, want)
			}
		})
	}
}

func TestResolveReleaseTriggerPush(t *testing.T) {
	t.Parallel()

	appPath := components["app"].ChangelogPath
	studioctlPath := components["studioctl"].ChangelogPath
	fileanalyzersPath := components["fileanalyzers"].ChangelogPath
	promotion := triggerChangelogPair{base: triggerBaseChangelog, head: triggerPromotedChangelog}
	ordinary := triggerChangelogPair{base: triggerBaseChangelog, head: triggerOrdinaryChangelog}

	tests := []struct {
		wantErr    error
		gitErr     error
		changelogs map[string]triggerChangelogPair
		want       ReleaseTriggerResult
		name       string
		refName    string
		changed    []string
	}{
		{
			name:       "app promotion on main",
			refName:    "main",
			changed:    []string{appPath},
			changelogs: map[string]triggerChangelogPair{appPath: promotion},
			want: ReleaseTriggerResult{
				Component:      "app",
				BaseBranch:     "main",
				MergeSHA:       triggerHeadSHA,
				ReleaseVersion: triggerVersion,
			},
		},
		{
			name:       "studioctl promotion on release branch",
			refName:    "release/studioctl/v1.2",
			changed:    []string{studioctlPath},
			changelogs: map[string]triggerChangelogPair{studioctlPath: promotion},
			want: ReleaseTriggerResult{
				Component:      "studioctl",
				BaseBranch:     "release/studioctl/v1.2",
				MergeSHA:       triggerHeadSHA,
				ReleaseVersion: triggerVersion,
			},
		},
		{
			name:       "ordinary changelog update is a no-op",
			refName:    "main",
			changed:    []string{appPath},
			changelogs: map[string]triggerChangelogPair{appPath: ordinary},
			want:       ReleaseTriggerResult{BaseBranch: "main", MergeSHA: triggerHeadSHA},
		},
		{
			name:    "multiple ordinary updates are a no-op",
			refName: "main",
			changed: []string{appPath, studioctlPath},
			changelogs: map[string]triggerChangelogPair{
				appPath:       ordinary,
				studioctlPath: ordinary,
			},
			want: ReleaseTriggerResult{BaseBranch: "main", MergeSHA: triggerHeadSHA},
		},
		{
			name:    "one promotion remains unambiguous beside an ordinary update",
			refName: "main",
			changed: []string{appPath, studioctlPath},
			changelogs: map[string]triggerChangelogPair{
				appPath:       promotion,
				studioctlPath: ordinary,
			},
			want: ReleaseTriggerResult{
				Component:      "app",
				BaseBranch:     "main",
				MergeSHA:       triggerHeadSHA,
				ReleaseVersion: triggerVersion,
			},
		},
		{
			name:    "promotion remains detectable beside a later entry for the same component",
			refName: "main",
			changed: []string{appPath},
			changelogs: map[string]triggerChangelogPair{
				appPath: {base: triggerBaseChangelog, head: triggerPromotedWithNewEntry},
			},
			want: ReleaseTriggerResult{
				Component:      "app",
				BaseBranch:     "main",
				MergeSHA:       triggerHeadSHA,
				ReleaseVersion: triggerVersion,
			},
		},
		{
			name:    "multiple promotions fail closed",
			refName: "main",
			changed: []string{appPath, studioctlPath},
			changelogs: map[string]triggerChangelogPair{
				appPath:       promotion,
				studioctlPath: promotion,
			},
			wantErr: errReleaseTriggerPromotionCount,
		},
		{
			name:    "invalid promotion fails closed",
			refName: "main",
			changed: []string{appPath},
			changelogs: map[string]triggerChangelogPair{
				appPath: {base: triggerBaseChangelog, head: triggerInvalidPromotion},
			},
			wantErr: errReleasePromotionMismatch,
		},
		{
			name:    "multiple versions for one component fail closed",
			refName: "main",
			changed: []string{appPath},
			changelogs: map[string]triggerChangelogPair{
				appPath: {base: triggerBaseChangelog, head: triggerMultiplePromotions},
			},
			wantErr: errReleasePromotionVersionCount,
		},
		{
			name:    "partial promotion fails closed",
			refName: "main",
			changed: []string{appPath},
			changelogs: map[string]triggerChangelogPair{
				appPath: {base: triggerPartialBaseChangelog, head: triggerPartialPromotion},
			},
			wantErr: errReleasePromotionMismatch,
		},
		{
			name:    "stabilization from prerelease history",
			refName: "release/app/v1.0",
			changed: []string{appPath},
			changelogs: map[string]triggerChangelogPair{
				appPath: {base: triggerStabilizationBase, head: triggerStabilizedChangelog},
			},
			want: ReleaseTriggerResult{
				Component:      "app",
				BaseBranch:     "release/app/v1.0",
				MergeSHA:       triggerHeadSHA,
				ReleaseVersion: triggerVersion,
			},
		},
		{
			name:    "component without a publisher is ignored",
			refName: "main",
			changed: []string{fileanalyzersPath},
			changelogs: map[string]triggerChangelogPair{
				fileanalyzersPath: promotion,
			},
			want: ReleaseTriggerResult{BaseBranch: "main", MergeSHA: triggerHeadSHA},
		},
		{
			name:    "deleted registered changelog fails closed",
			refName: "main",
			changed: []string{appPath},
			changelogs: map[string]triggerChangelogPair{
				appPath: {base: triggerBaseChangelog, headErr: errTriggerMissingHead},
			},
			wantErr: errTriggerMissingHead,
		},
		{
			name:    "renamed registered changelog fails closed",
			refName: "main",
			changed: []string{appPath, "src/App/backend/CHANGELOG-renamed.md"},
			changelogs: map[string]triggerChangelogPair{
				appPath: {base: triggerBaseChangelog, headErr: errTriggerMissingHead},
			},
			wantErr: errTriggerMissingHead,
		},
		{
			name:       "promotion must match release branch component",
			refName:    "release/studioctl/v1.2",
			changed:    []string{appPath},
			changelogs: map[string]triggerChangelogPair{appPath: promotion},
			wantErr:    errBaseBranchMismatch,
		},
		{
			name:    "unrelated push is a no-op",
			refName: "main",
			changed: []string{"README.md"},
			want:    ReleaseTriggerResult{BaseBranch: "main", MergeSHA: triggerHeadSHA},
		},
		{
			name:    "git errors fail closed",
			refName: "main",
			gitErr:  errTriggerGit,
			wantErr: errTriggerGit,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			git := newFakeReleaseTriggerGit(tc.changed, tc.changelogs, tc.gitErr)
			got, err := resolveReleaseTriggerWithDeps(t.Context(), ReleaseTriggerRequest{
				EventName: "push",
				RefName:   tc.refName,
				RefType:   "branch",
				SHA:       triggerHeadSHA,
				BeforeSHA: triggerBeforeSHA,
			}, git)
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("resolveReleaseTriggerWithDeps() error = %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("resolveReleaseTriggerWithDeps() error = %v", err)
			}
			if got != tc.want {
				t.Fatalf("resolveReleaseTriggerWithDeps() = %+v, want %+v", got, tc.want)
			}
		})
	}
}

func TestResolveReleaseTriggerPushRequiredInputs(t *testing.T) {
	t.Parallel()

	request := ReleaseTriggerRequest{
		EventName: "push",
		RefName:   "main",
		RefType:   "branch",
		SHA:       triggerHeadSHA,
		BeforeSHA: triggerBeforeSHA,
	}

	t.Run("before SHA", func(t *testing.T) {
		t.Parallel()
		withoutBefore := request
		withoutBefore.BeforeSHA = ""
		_, err := resolveReleaseTriggerWithDeps(t.Context(), withoutBefore, fakeReleaseTriggerGit{})
		if !errors.Is(err, errReleaseTriggerBeforeRequired) {
			t.Fatalf("resolveReleaseTriggerWithDeps() error = %v, want %v", err, errReleaseTriggerBeforeRequired)
		}
	})

	t.Run("git reader", func(t *testing.T) {
		t.Parallel()
		_, err := resolveReleaseTriggerWithDeps(t.Context(), request, nil)
		if !errors.Is(err, errGitRequired) {
			t.Fatalf("resolveReleaseTriggerWithDeps() error = %v, want %v", err, errGitRequired)
		}
	})

	t.Run("new branch is a no-op", func(t *testing.T) {
		t.Parallel()
		newBranch := request
		newBranch.BeforeSHA = strings.Repeat("0", 40)
		got, err := resolveReleaseTriggerWithDeps(t.Context(), newBranch, nil)
		if err != nil {
			t.Fatalf("resolveReleaseTriggerWithDeps() error = %v", err)
		}
		want := ReleaseTriggerResult{BaseBranch: "main", MergeSHA: triggerHeadSHA}
		if got != want {
			t.Fatalf("resolveReleaseTriggerWithDeps() = %+v, want %+v", got, want)
		}
	})

	t.Run("deleted branch is a no-op", func(t *testing.T) {
		t.Parallel()
		deletedBranch := request
		deletedBranch.SHA = strings.Repeat("0", 40)
		got, err := resolveReleaseTriggerWithDeps(t.Context(), deletedBranch, nil)
		if err != nil {
			t.Fatalf("resolveReleaseTriggerWithDeps() error = %v", err)
		}
		want := ReleaseTriggerResult{BaseBranch: "main", MergeSHA: deletedBranch.SHA}
		if got != want {
			t.Fatalf("resolveReleaseTriggerWithDeps() = %+v, want %+v", got, want)
		}
	})
}

func newFakeReleaseTriggerGit(
	changed []string,
	changelogs map[string]triggerChangelogPair,
	runErr error,
) fakeReleaseTriggerGit {
	outputs := map[string]string{
		strings.Join(releaseTriggerDiffArgs(triggerBeforeSHA, triggerHeadSHA), " "): strings.Join(changed, "\n"),
	}
	commandErrs := make(map[string]error)
	for path, pair := range changelogs {
		outputs["show "+triggerBeforeSHA+":"+path] = pair.base
		headCommand := "show " + triggerHeadSHA + ":" + path
		if pair.headErr != nil {
			commandErrs[headCommand] = pair.headErr
		} else {
			outputs[headCommand] = pair.head
		}
	}
	return fakeReleaseTriggerGit{outputs: outputs, commandErrs: commandErrs, err: runErr}
}

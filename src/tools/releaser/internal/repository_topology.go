package internal

import (
	"context"
	"fmt"
	"net/url"
	"path"
	"path/filepath"
	"strings"
)

const (
	canonicalRepositoryName = "Altinn/altinn-studio"
	canonicalRepositoryURL  = "https://github.com/" + canonicalRepositoryName
)

// Repository identifies a GitHub repository independently of a local Git remote name.
type Repository struct {
	NameWithOwner string
	URL           string
}

// RepositoryTopology maps release roles to the repository's configured Git remotes.
type RepositoryTopology struct {
	BaseRepository Repository
	PushRepository Repository
	SourceRemote   string
	SourcePushURL  string
	PushRemote     string
	SourcePushURLs int
}

func (t RepositoryTopology) pullRequestHead(branch string) string {
	if strings.EqualFold(t.PushRepository.NameWithOwner, t.BaseRepository.NameWithOwner) &&
		t.PushRepository.NameWithOwner != "" {
		return branch
	}
	owner, _, found := strings.Cut(t.PushRepository.NameWithOwner, "/")
	if !found || owner == "" {
		return ""
	}
	return owner + ":" + branch
}

func (t RepositoryTopology) canonicalPushRemote() (string, error) {
	if t.SourcePushURLs != 1 {
		return "", fmt.Errorf("%w: %s", errPushRemoteMultipleURLs, t.SourceRemote)
	}
	if normalizeRepositoryLocation(t.SourcePushURL) != normalizeRepositoryLocation(t.BaseRepository.URL) {
		return "", fmt.Errorf("%w: %s", errCanonicalPushMismatch, t.SourceRemote)
	}
	return t.SourceRemote, nil
}

func discoverRepositoryTopology(
	ctx context.Context,
	git GitRunner,
	gh GitHubRunner,
) (RepositoryTopology, error) {
	remotes, err := git.Remotes(ctx)
	if err != nil {
		return RepositoryTopology{}, fmt.Errorf("list git remotes: %w", err)
	}
	pushRemote, err := git.PushRemote(ctx, remotes)
	if err != nil {
		return RepositoryTopology{}, fmt.Errorf("resolve git push remote: %w", err)
	}

	pushRepository, parent, err := gh.Repository(ctx, pushRemote.PushURL)
	if err != nil {
		return RepositoryTopology{}, fmt.Errorf("resolve GitHub repository for %s: %w", pushRemote.Name, err)
	}

	baseRepository := pushRepository
	if parent != nil {
		baseRepository = *parent
	}
	sourceRemote, err := matchRepositoryRemote(remotes, baseRepository)
	if err != nil {
		return RepositoryTopology{}, err
	}

	return RepositoryTopology{
		BaseRepository: baseRepository,
		PushRepository: pushRepository,
		SourceRemote:   sourceRemote.Name,
		SourcePushURL:  sourceRemote.PushURL,
		SourcePushURLs: sourceRemote.PushURLs,
		PushRemote:     pushRemote.Name,
	}, nil
}

func matchRepositoryRemote(remotes []GitRemote, repository Repository) (GitRemote, error) {
	repositoryKey := normalizeRepositoryLocation(repository.URL)
	var firstMatch GitRemote
	found := false
	for _, remote := range remotes {
		if repositoryKey == "" || normalizeRepositoryLocation(remote.FetchURL) != repositoryKey {
			continue
		}
		if !found {
			firstMatch = remote
			found = true
		}
		if remote.PushURLs == 1 &&
			normalizeRepositoryLocation(remote.PushURL) == repositoryKey {
			return remote, nil
		}
	}
	if found {
		return firstMatch, nil
	}

	return GitRemote{}, fmt.Errorf(
		"%w: configure a remote for %s",
		errCanonicalRemoteMissing,
		displayRepository(repository),
	)
}

func displayRepository(repository Repository) string {
	if repository.NameWithOwner != "" {
		return repository.NameWithOwner
	}
	return repository.URL
}

func normalizeRepositoryLocation(rawURL string) string {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return ""
	}

	if host, repoPath, ok := splitSCPRepositoryURL(rawURL); ok {
		return normalizeHostedRepository(host, repoPath)
	}

	parsed, err := url.Parse(rawURL)
	if err == nil && parsed.Scheme != "" && parsed.Host != "" {
		return normalizeHostedRepository(parsed.Hostname(), parsed.Path)
	}

	absolute, err := filepath.Abs(rawURL)
	if err != nil {
		return strings.TrimSuffix(filepath.Clean(rawURL), ".git")
	}
	return strings.TrimSuffix(filepath.Clean(absolute), ".git")
}

func repositorySelectorFromURL(rawURL string) string {
	host, repoPath, ok := splitHostedRepositoryURL(rawURL)
	if !ok {
		return ""
	}

	repositoryName := normalizeRepositoryPath(repoPath)
	if isGitHubRepositoryHost(rawURL, host) {
		return repositoryName
	}
	return strings.ToLower(host) + "/" + repositoryName
}

func isGitHubRepositoryHost(rawURL, host string) bool {
	if strings.EqualFold(host, "github.com") {
		return true
	}
	if !strings.EqualFold(host, "ssh.github.com") {
		return false
	}
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	return err == nil && strings.EqualFold(parsed.Scheme, "ssh")
}

func splitHostedRepositoryURL(rawURL string) (host, repoPath string, ok bool) {
	if scpHost, scpPath, scpOK := splitSCPRepositoryURL(rawURL); scpOK {
		return scpHost, scpPath, true
	}
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || parsed.Hostname() == "" {
		return "", "", false
	}
	return parsed.Hostname(), parsed.Path, true
}

func splitSCPRepositoryURL(rawURL string) (host, repoPath string, ok bool) {
	if strings.Contains(rawURL, "://") {
		return "", "", false
	}
	colon := strings.IndexByte(rawURL, ':')
	if colon <= 0 || strings.Contains(rawURL[:colon], "/") {
		return "", "", false
	}
	host = rawURL[:colon]
	if at := strings.LastIndexByte(host, '@'); at >= 0 {
		host = host[at+1:]
	}
	return host, rawURL[colon+1:], host != "" && rawURL[colon+1:] != ""
}

func normalizeHostedRepository(host, repoPath string) string {
	return strings.ToLower(strings.TrimSpace(host) + "/" + normalizeRepositoryPath(repoPath))
}

func normalizeRepositoryPath(repoPath string) string {
	repoPath = strings.Trim(strings.TrimSpace(repoPath), "/")
	repoPath = strings.TrimSuffix(repoPath, ".git")
	return path.Clean(repoPath)
}

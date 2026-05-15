package install

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/httpclient"
	"altinn.studio/studioctl/internal/osutil"
)

const (
	defaultUpdateRepo     = "Altinn/altinn-studio"
	githubAPIReposBaseURL = "https://api.github.com/repos"
	httpTimeout           = 5 * time.Minute
	studioctlTagPrefix    = "studioctl/v"
	studioctlPreview      = "-preview."
	releasePageSize       = 100
	releaseMaxPages       = 10
	versionCorePartCount  = 3
)

var (
	errInvalidReleaseVersion      = errors.New("invalid release version format")
	errUnsupportedPlatform        = errors.New("unsupported platform for self update")
	errUnsupportedArchitecture    = errors.New("unsupported architecture for self update")
	errChecksumVerificationFailed = errors.New("checksum verification failed")
	// ErrUpdateUnsupported is returned when self update cannot be performed on current OS.
	ErrUpdateUnsupported        = errors.New("self update not supported on this platform")
	errUninstallUnsupported     = errors.New("self uninstall not supported on this platform")
	errUnsafeHomeRemoval        = errors.New("unsafe studioctl home directory")
	errUnexpectedHTTPStatus     = errors.New("unexpected HTTP status")
	errStudioctlReleaseNotFound = errors.New("studioctl release not found")
)

// UpdateOptions controls self update behavior.
type UpdateOptions struct {
	Version      string
	SkipChecksum bool
}

// UninstallResult describes a completed self uninstall.
type UninstallResult struct {
	RemovedPath string
}

// ResolvedBundle describes a downloaded update bundle and its install target.
type ResolvedBundle struct {
	Cleanup func() error
	Bundle  Bundle
}

type resolvedUpdate struct {
	asset      string
	binaryBase string
	checksums  string
	targetPath string
	version    string
	skipCheck  bool
}

type httpDownloader struct {
	client  *http.Client
	version config.Version
}

func newHTTPDownloader(version config.Version) httpDownloader {
	return httpDownloader{
		version: version,
		client:  &http.Client{Timeout: httpTimeout},
	}
}

// ResolveUpdateBundle downloads an update bundle and returns the current install target.
func (s *Service) ResolveUpdateBundle(
	ctx context.Context,
	opts UpdateOptions,
) (ResolvedBundle, error) {
	execPath, err := currentExecutablePath()
	if err != nil {
		return ResolvedBundle{}, fmt.Errorf("resolve current executable path: %w", err)
	}

	if runtime.GOOS == osutil.OSWindows {
		return ResolvedBundle{}, fmt.Errorf(
			"%w: windows executable is locked while running",
			ErrUpdateUnsupported,
		)
	}

	downloads := newHTTPDownloader(s.cfg.Version)
	resolved, err := downloads.resolveUpdateOptions(ctx, opts, execPath)
	if err != nil {
		return ResolvedBundle{}, err
	}

	tmpBinaryPath, cleanup, err := downloads.downloadUpdateBinary(ctx, resolved)
	if err != nil {
		if cleanup != nil {
			err = errors.Join(err, cleanup())
		}
		return ResolvedBundle{}, err
	}

	if !resolved.skipCheck {
		if verifyErr := downloads.verifyAssetChecksum(
			ctx,
			resolved.checksums,
			resolved.asset,
			tmpBinaryPath,
		); verifyErr != nil {
			if cleanup != nil {
				verifyErr = errors.Join(verifyErr, cleanup())
			}
			return ResolvedBundle{}, verifyErr
		}
	}

	return ResolvedBundle{
		Cleanup: cleanup,
		Bundle: Bundle{
			Version:              strings.TrimPrefix(resolved.version, "studioctl/"),
			BinaryPath:           tmpBinaryPath,
			ResourcesArchivePath: "",
			installPath:          resolved.targetPath,
		},
	}, nil
}

func (d httpDownloader) resolveUpdateOptions(
	ctx context.Context,
	opts UpdateOptions,
	execPath string,
) (resolvedUpdate, error) {
	version, err := normalizeReleaseVersion(opts.Version)
	if err != nil {
		return resolvedUpdate{}, err
	}
	if version == "" {
		version, err = d.resolveLatestStudioctlVersion(ctx, defaultUpdateRepo)
		if err != nil {
			return resolvedUpdate{}, err
		}
	}

	asset, err := defaultAssetName(runtime.GOOS, runtime.GOARCH)
	if err != nil {
		return resolvedUpdate{}, err
	}

	binaryBase, checksums := releaseURLs(defaultUpdateRepo, version)

	return resolvedUpdate{
		asset:      asset,
		binaryBase: binaryBase,
		checksums:  checksums,
		targetPath: execPath,
		version:    version,
		skipCheck:  opts.SkipChecksum,
	}, nil
}

func (d httpDownloader) resolveLatestStudioctlVersion(ctx context.Context, repo string) (string, error) {
	return d.resolveLatestStudioctlVersionFromBase(ctx, repo, githubAPIReposBaseURL)
}

type studioctlTagVersion struct {
	major     int
	minor     int
	patch     int
	preview   int
	isPreview bool
}

// TODO: Consolidate studioctl tag parsing/comparison with releaser into a shared package to prevent selection drift.
func parseStudioctlTagVersion(tag string) (studioctlTagVersion, bool) {
	if !strings.HasPrefix(tag, studioctlTagPrefix) {
		var empty studioctlTagVersion
		return empty, false
	}

	version := strings.TrimPrefix(tag, studioctlTagPrefix)
	core, previewNumber, hasPreview := strings.Cut(version, studioctlPreview)
	if !hasPreview {
		if strings.Contains(version, "-") {
			var empty studioctlTagVersion
			return empty, false
		}
		major, minor, patch, ok := parseVersionCore(version)
		if !ok {
			var empty studioctlTagVersion
			return empty, false
		}
		return studioctlTagVersion{major: major, minor: minor, patch: patch, preview: 0, isPreview: false}, true
	}

	if core == "" || previewNumber == "" || strings.Contains(previewNumber, "-") {
		var empty studioctlTagVersion
		return empty, false
	}

	major, minor, patch, ok := parseVersionCore(core)
	if !ok {
		var empty studioctlTagVersion
		return empty, false
	}
	preview, ok := parseVersionNumber(previewNumber)
	if !ok {
		var empty studioctlTagVersion
		return empty, false
	}

	return studioctlTagVersion{
		major:     major,
		minor:     minor,
		patch:     patch,
		preview:   preview,
		isPreview: true,
	}, true
}

func parseVersionCore(version string) (int, int, int, bool) {
	parts := strings.Split(version, ".")
	if len(parts) != versionCorePartCount {
		return 0, 0, 0, false
	}

	major, ok := parseVersionNumber(parts[0])
	if !ok {
		return 0, 0, 0, false
	}
	minor, ok := parseVersionNumber(parts[1])
	if !ok {
		return 0, 0, 0, false
	}
	patch, ok := parseVersionNumber(parts[2])
	if !ok {
		return 0, 0, 0, false
	}

	return major, minor, patch, true
}

func parseVersionNumber(raw string) (int, bool) {
	if raw == "" {
		return 0, false
	}
	for _, ch := range raw {
		if ch < '0' || ch > '9' {
			return 0, false
		}
	}

	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0, false
	}
	return value, true
}

func compareCoreVersion(a, b studioctlTagVersion) int {
	if a.major != b.major {
		return compareInt(a.major, b.major)
	}
	if a.minor != b.minor {
		return compareInt(a.minor, b.minor)
	}
	return compareInt(a.patch, b.patch)
}

func comparePreviewVersion(a, b studioctlTagVersion) int {
	if cmp := compareCoreVersion(a, b); cmp != 0 {
		return cmp
	}
	return compareInt(a.preview, b.preview)
}

func compareInt(a, b int) int {
	if a > b {
		return 1
	}
	if a < b {
		return -1
	}
	return 0
}

func (d httpDownloader) resolveLatestStudioctlVersionFromBase(
	ctx context.Context,
	repo,
	baseURL string,
) (string, error) {
	var candidates releaseCandidates

	for page := 1; page <= releaseMaxPages; page++ {
		releases, err := d.fetchReleasesPage(ctx, repo, baseURL, page)
		if err != nil {
			return "", err
		}
		candidates.include(releases)
		if len(releases) < releasePageSize {
			break
		}
	}

	if tag, ok := candidates.resolveTag(); ok {
		return tag, nil
	}

	return "", fmt.Errorf("%w: repo=%s", errStudioctlReleaseNotFound, repo)
}

type githubRelease struct {
	TagName    string `json:"tag_name"` //nolint:tagliatelle // upstream field name
	Draft      bool   `json:"draft"`
	Prerelease bool   `json:"prerelease"`
}

func (d httpDownloader) fetchReleasesPage(
	ctx context.Context,
	repo,
	baseURL string,
	page int,
) ([]githubRelease, error) {
	releasesURL := fmt.Sprintf(
		"%s/%s/releases?per_page=%d&page=%d",
		baseURL,
		repo,
		releasePageSize,
		page,
	)
	data, err := d.downloadToMemory(ctx, releasesURL)
	if err != nil {
		return nil, err
	}

	var releases []githubRelease
	if err := json.Unmarshal(data, &releases); err != nil {
		return nil, fmt.Errorf("parse release metadata: %w", err)
	}
	return releases, nil
}

type releaseCandidates struct {
	bestStableTag  string
	bestPreviewTag string
	bestStable     studioctlTagVersion
	bestPreview    studioctlTagVersion
}

func (c *releaseCandidates) include(releases []githubRelease) {
	for _, rel := range releases {
		if rel.Draft {
			continue
		}

		tag, ok := parseStudioctlTagVersion(rel.TagName)
		if !ok {
			continue
		}
		if !tag.isPreview && rel.Prerelease {
			continue
		}

		if tag.isPreview {
			if c.bestPreviewTag == "" || comparePreviewVersion(tag, c.bestPreview) > 0 {
				c.bestPreview = tag
				c.bestPreviewTag = rel.TagName
			}
			continue
		}

		if c.bestStableTag == "" || compareCoreVersion(tag, c.bestStable) > 0 {
			c.bestStable = tag
			c.bestStableTag = rel.TagName
		}
	}
}

func (c *releaseCandidates) resolveTag() (string, bool) {
	if c.bestStableTag != "" {
		return c.bestStableTag, true
	}
	if c.bestPreviewTag != "" {
		return c.bestPreviewTag, true
	}
	return "", false
}

func (d httpDownloader) downloadUpdateBinary(
	ctx context.Context,
	plan resolvedUpdate,
) (binaryPath string, cleanup func() error, err error) {
	tmpDir, err := os.MkdirTemp("", "studioctl-self-update-*")
	if err != nil {
		return "", nil, fmt.Errorf("create temp dir: %w", err)
	}

	cleanup = func() error {
		if removeErr := os.RemoveAll(tmpDir); removeErr != nil {
			return fmt.Errorf("remove temp dir %q: %w", tmpDir, removeErr)
		}
		return nil
	}

	binaryPath = filepath.Join(tmpDir, "studioctl-download")
	if runtime.GOOS == osutil.OSWindows {
		binaryPath += exeSuffix
	}

	if err := d.downloadToFile(ctx, plan.binaryBase+"/"+plan.asset, binaryPath); err != nil {
		return "", cleanup, err
	}

	if runtime.GOOS != osutil.OSWindows {
		if err := os.Chmod(binaryPath, executablePerm); err != nil {
			return "", cleanup, fmt.Errorf("make downloaded binary executable: %w", err)
		}
	}

	return binaryPath, cleanup, nil
}

// UninstallBinary removes the current executable from disk.
func (s *Service) UninstallBinary() (UninstallResult, error) {
	execPath, err := currentExecutablePath()
	if err != nil {
		return UninstallResult{}, fmt.Errorf("resolve current executable path: %w", err)
	}

	if runtime.GOOS == osutil.OSWindows {
		return UninstallResult{}, fmt.Errorf(
			"%w: remove manually after process exits",
			errUninstallUnsupported,
		)
	}

	if err := os.Remove(execPath); err != nil {
		return UninstallResult{}, fmt.Errorf("remove binary %q: %w", execPath, err)
	}

	return UninstallResult{RemovedPath: execPath}, nil
}

// RemoveHome removes the studioctl home directory.
func (s *Service) RemoveHome() (string, error) {
	home, err := safeHomeRemovalPath(s.cfg.Home)
	if err != nil {
		return "", err
	}
	if err := os.RemoveAll(home); err != nil {
		return "", fmt.Errorf("remove home directory %q: %w", home, err)
	}
	return home, nil
}

// ValidateHomeRemoval checks whether the studioctl home directory can be removed safely.
func (s *Service) ValidateHomeRemoval() error {
	_, err := safeHomeRemovalPath(s.cfg.Home)
	return err
}

func safeHomeRemovalPath(home string) (string, error) {
	if strings.TrimSpace(home) == "" {
		return "", fmt.Errorf("%w: empty path", errUnsafeHomeRemoval)
	}

	absHome, err := filepath.Abs(home)
	if err != nil {
		return "", fmt.Errorf("resolve home directory: %w", err)
	}
	cleanHome := filepath.Clean(absHome)
	if isPathRoot(cleanHome) {
		return "", fmt.Errorf("%w: %s", errUnsafeHomeRemoval, cleanHome)
	}

	userHome, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("%w: resolve user home directory: %w", errUnsafeHomeRemoval, err)
	}
	if samePath(cleanHome, userHome) {
		return "", fmt.Errorf("%w: %s", errUnsafeHomeRemoval, cleanHome)
	}
	userConfigDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("%w: resolve user config directory: %w", errUnsafeHomeRemoval, err)
	}
	if samePath(cleanHome, userConfigDir) {
		return "", fmt.Errorf("%w: %s", errUnsafeHomeRemoval, cleanHome)
	}
	cwd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("%w: resolve current directory: %w", errUnsafeHomeRemoval, err)
	}
	if pathContains(cleanHome, cwd) {
		return "", fmt.Errorf("%w: %s contains current directory %s", errUnsafeHomeRemoval, cleanHome, cwd)
	}

	return cleanHome, nil
}

func isPathRoot(path string) bool {
	volume := filepath.VolumeName(path)
	root := volume + string(os.PathSeparator)
	return path == root
}

func samePath(left, right string) bool {
	left = filepath.Clean(left)
	right = filepath.Clean(right)
	if runtime.GOOS == osutil.OSWindows {
		return strings.EqualFold(left, right)
	}
	return left == right
}

func pathContains(parent, child string) bool {
	parent = filepath.Clean(parent)
	child = filepath.Clean(child)
	if samePath(parent, child) {
		return true
	}
	rel, err := filepath.Rel(parent, child)
	if err != nil {
		return false
	}
	return rel != ".." && !strings.HasPrefix(rel, ".."+string(os.PathSeparator))
}

func currentExecutablePath() (string, error) {
	execPath, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("get executable path: %w", err)
	}

	resolvedPath, err := filepath.EvalSymlinks(execPath)
	if err != nil {
		return "", fmt.Errorf("resolve executable symlinks: %w", err)
	}

	return resolvedPath, nil
}

func normalizeReleaseVersion(raw string) (string, error) {
	version := strings.TrimSpace(raw)
	if version == "" {
		return "", nil
	}

	if strings.EqualFold(version, "latest") {
		return "", fmt.Errorf("%w: expected vX.Y.Z or studioctl/vX.Y.Z", errInvalidReleaseVersion)
	}

	version = strings.TrimPrefix(version, "studioctl/")
	if !strings.HasPrefix(version, "v") {
		return "", fmt.Errorf("%w: expected vX.Y.Z or studioctl/vX.Y.Z", errInvalidReleaseVersion)
	}
	return "studioctl/" + version, nil
}

func defaultAssetName(goos, goarch string) (string, error) {
	return assetNameWithBase("studioctl", goos, goarch)
}

func assetNameWithBase(baseName, goos, goarch string) (string, error) {
	asset, err := baseAssetName(baseName, goos, goarch)
	if err != nil {
		return "", err
	}
	if goos == osutil.OSWindows {
		asset += exeSuffix
	}
	return asset, nil
}

func baseAssetName(baseName, goos, goarch string) (string, error) {
	var osPart string
	switch goos {
	case osutil.OSLinux:
		osPart = osutil.OSLinux
	case osutil.OSDarwin:
		osPart = osutil.OSDarwin
	case osutil.OSWindows:
		osPart = osutil.OSWindows
	default:
		return "", fmt.Errorf("%w: %s", errUnsupportedPlatform, goos)
	}

	var archPart string
	switch goarch {
	case "amd64":
		archPart = "amd64"
	case "arm64":
		archPart = "arm64"
	default:
		return "", fmt.Errorf("%w: %s", errUnsupportedArchitecture, goarch)
	}

	return baseName + "-" + osPart + "-" + archPart, nil
}

func releaseURLs(repo, version string) (binaryBaseURL, checksumsURL string) {
	base := "https://github.com/" + repo + "/releases/download/" + version
	return base, base + "/" + checksumAssetName
}

func (d httpDownloader) downloadToFile(ctx context.Context, url, path string) (err error) {
	resp, err := d.get(ctx, url)
	if err != nil {
		return err
	}
	defer func() {
		err = errors.Join(err, closeWithError(resp.Body, "close response body", nil))
	}()

	//nolint:gosec // G304: path points to a temp file path under process control.
	file, err := os.OpenFile(path, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, osutil.FilePermDefault)
	if err != nil {
		return fmt.Errorf("create download file %q: %w", path, err)
	}
	defer func() {
		err = errors.Join(err, closeWithError(file, "close download file", nil))
	}()

	if _, err := io.Copy(file, resp.Body); err != nil {
		return fmt.Errorf("write download file %q: %w", path, err)
	}

	return nil
}

func (d httpDownloader) verifyAssetChecksum(
	ctx context.Context,
	checksumsURL,
	asset,
	binaryPath string,
) error {
	checksums, err := d.downloadToMemory(ctx, checksumsURL)
	if err != nil {
		return err
	}

	expected, err := checksumForAsset(checksums, asset)
	if err != nil {
		return err
	}

	actual, err := fileSHA256(binaryPath)
	if err != nil {
		return err
	}

	if expected != actual {
		return fmt.Errorf(
			"%w: expected %s, got %s",
			errChecksumVerificationFailed,
			expected,
			actual,
		)
	}
	return nil
}

func (d httpDownloader) downloadToMemory(ctx context.Context, url string) (data []byte, err error) {
	resp, err := d.get(ctx, url)
	if err != nil {
		return nil, err
	}
	defer func() {
		err = errors.Join(err, closeWithError(resp.Body, "close response body", nil))
	}()

	data, err = io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response body: %w", err)
	}
	return data, nil
}

func (d httpDownloader) get(ctx context.Context, url string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpclient.SetUserAgent(req, d.version)

	resp, err := d.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("download %q: %w", url, err)
	}

	if resp.StatusCode != http.StatusOK {
		statusErr := fmt.Errorf("%w: GET %s returned %d", errUnexpectedHTTPStatus, url, resp.StatusCode)
		return nil, errors.Join(statusErr, closeWithError(resp.Body, "close response body", nil))
	}

	return resp, nil
}

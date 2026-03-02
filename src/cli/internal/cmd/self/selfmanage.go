package self

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
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

	"altinn.studio/studioctl/internal/osutil"
)

const (
	defaultUpdateRepo     = "Altinn/altinn-studio"
	githubAPIReposBaseURL = "https://api.github.com/repos"
	httpTimeout           = 5 * time.Minute
	sha256HexLength       = 64
	studioctlTagPrefix    = "studioctl/v"
	studioctlPreview      = "-preview."
	releasePageSize       = 100
	releaseMaxPages       = 10
	versionCorePartCount  = 3
)

var (
	// ErrInvalidReleaseVersion is returned when the version flag format is invalid.
	ErrInvalidReleaseVersion = errors.New("invalid release version format")
	// ErrUnsupportedPlatform is returned when there is no release asset for current platform.
	ErrUnsupportedPlatform = errors.New("unsupported platform for self update")
	// ErrUnsupportedArchitecture is returned when there is no release asset for current architecture.
	ErrUnsupportedArchitecture = errors.New("unsupported architecture for self update")
	// ErrChecksumVerificationFailed is returned when downloaded asset checksum does not match.
	ErrChecksumVerificationFailed = errors.New("checksum verification failed")
	// ErrChecksumAssetNotFound is returned when target asset is missing from checksum file.
	ErrChecksumAssetNotFound = errors.New("asset checksum not found")
	// ErrUpdateUnsupported is returned when self update cannot be performed on current OS.
	ErrUpdateUnsupported = errors.New("self update not supported on this platform")
	// ErrUninstallUnsupported is returned when uninstall cannot be performed safely on current OS.
	ErrUninstallUnsupported = errors.New("self uninstall not supported on this platform")
	// ErrUnexpectedHTTPStatus is returned when a release endpoint returns non-200 status.
	ErrUnexpectedHTTPStatus = errors.New("unexpected HTTP status")
	// ErrStudioctlReleaseNotFound is returned when no studioctl release tags are found.
	ErrStudioctlReleaseNotFound = errors.New("studioctl release not found")
)

// UpdateOptions controls self update behavior.
type UpdateOptions struct {
	Version      string
	SkipChecksum bool
}

// UpdateResult describes a completed self update.
type UpdateResult struct {
	Asset         string
	TargetPath    string
	ReleaseSource string
}

// UninstallResult describes a completed self uninstall.
type UninstallResult struct {
	RemovedPath string
}

type resolvedUpdate struct {
	asset      string
	binaryBase string
	checksums  string
	targetPath string
	skipCheck  bool
}

// UpdateBinary downloads a release binary and installs it over the current binary path.
func (s *Service) UpdateBinary(ctx context.Context, opts UpdateOptions) (result UpdateResult, err error) {
	execPath, err := currentExecutablePath()
	if err != nil {
		return UpdateResult{}, fmt.Errorf("resolve current executable path: %w", err)
	}

	if runtime.GOOS == osWindows {
		return UpdateResult{}, fmt.Errorf(
			"%w: windows executable is locked while running",
			ErrUpdateUnsupported,
		)
	}

	resolved, err := resolveUpdateOptions(ctx, opts, execPath)
	if err != nil {
		return UpdateResult{}, err
	}

	tmpBinaryPath, cleanup, err := downloadUpdateBinary(ctx, resolved)
	if cleanup != nil {
		defer func() {
			err = errors.Join(err, cleanup())
		}()
	}
	if err != nil {
		return UpdateResult{}, err
	}

	if !resolved.skipCheck {
		if verifyErr := verifyAssetChecksum(ctx, resolved.checksums, resolved.asset, tmpBinaryPath); verifyErr != nil {
			return UpdateResult{}, verifyErr
		}
	}

	if installErr := installFromDownloadedBinary(tmpBinaryPath, resolved.targetPath); installErr != nil {
		return UpdateResult{}, installErr
	}

	result = UpdateResult{
		Asset:         resolved.asset,
		TargetPath:    resolved.targetPath,
		ReleaseSource: resolved.binaryBase,
	}
	return result, nil
}

func resolveUpdateOptions(ctx context.Context, opts UpdateOptions, execPath string) (resolvedUpdate, error) {
	version, err := NormalizeReleaseVersion(opts.Version)
	if err != nil {
		return resolvedUpdate{}, err
	}
	if version == "" {
		version, err = resolveLatestStudioctlVersion(ctx, defaultUpdateRepo)
		if err != nil {
			return resolvedUpdate{}, err
		}
	}

	asset, err := DefaultAssetName(runtime.GOOS, runtime.GOARCH)
	if err != nil {
		return resolvedUpdate{}, err
	}

	binaryBase, checksums := ReleaseURLs(defaultUpdateRepo, version)

	return resolvedUpdate{
		asset:      asset,
		binaryBase: binaryBase,
		checksums:  checksums,
		targetPath: execPath,
		skipCheck:  opts.SkipChecksum,
	}, nil
}

func resolveLatestStudioctlVersion(ctx context.Context, repo string) (string, error) {
	return resolveLatestStudioctlVersionFromBase(ctx, repo, githubAPIReposBaseURL)
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

func resolveLatestStudioctlVersionFromBase(ctx context.Context, repo, baseURL string) (string, error) {
	var candidates releaseCandidates

	for page := 1; page <= releaseMaxPages; page++ {
		releases, err := fetchReleasesPage(ctx, repo, baseURL, page)
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

	return "", fmt.Errorf("%w: repo=%s", ErrStudioctlReleaseNotFound, repo)
}

type githubRelease struct {
	TagName    string `json:"tag_name"` //nolint:tagliatelle // upstream field name
	Draft      bool   `json:"draft"`
	Prerelease bool   `json:"prerelease"`
}

func fetchReleasesPage(ctx context.Context, repo, baseURL string, page int) ([]githubRelease, error) {
	releasesURL := fmt.Sprintf(
		"%s/%s/releases?per_page=%d&page=%d",
		baseURL,
		repo,
		releasePageSize,
		page,
	)
	data, err := downloadToMemory(ctx, releasesURL)
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

func downloadUpdateBinary(
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
	if runtime.GOOS == osWindows {
		binaryPath += exeSuffix
	}

	if err := downloadToFile(ctx, plan.binaryBase+"/"+plan.asset, binaryPath); err != nil {
		return "", cleanup, err
	}

	if runtime.GOOS != osWindows {
		if err := os.Chmod(binaryPath, executablePerm); err != nil {
			return "", cleanup, fmt.Errorf("make downloaded binary executable: %w", err)
		}
	}

	return binaryPath, cleanup, nil
}

func installFromDownloadedBinary(downloadedBinaryPath, targetPath string) error {
	if err := copyFile(downloadedBinaryPath, targetPath); err != nil {
		return fmt.Errorf("replace installed binary: %w", err)
	}
	if runtime.GOOS != osWindows {
		if err := os.Chmod(targetPath, executablePerm); err != nil {
			return fmt.Errorf("make installed binary executable: %w", err)
		}
	}
	return nil
}

// UninstallBinary removes the current executable from disk.
func (s *Service) UninstallBinary() (UninstallResult, error) {
	execPath, err := currentExecutablePath()
	if err != nil {
		return UninstallResult{}, fmt.Errorf("resolve current executable path: %w", err)
	}

	if runtime.GOOS == osWindows {
		return UninstallResult{}, fmt.Errorf(
			"%w: remove manually after process exits",
			ErrUninstallUnsupported,
		)
	}

	if err := os.Remove(execPath); err != nil {
		return UninstallResult{}, fmt.Errorf("remove binary %q: %w", execPath, err)
	}

	return UninstallResult{RemovedPath: execPath}, nil
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

// NormalizeReleaseVersion normalizes user-provided release version input.
func NormalizeReleaseVersion(raw string) (string, error) {
	version := strings.TrimSpace(raw)
	if version == "" {
		return "", nil
	}

	if strings.EqualFold(version, "latest") {
		return "", fmt.Errorf("%w: expected vX.Y.Z or studioctl/vX.Y.Z", ErrInvalidReleaseVersion)
	}

	version = strings.TrimPrefix(version, "studioctl/")
	if !strings.HasPrefix(version, "v") {
		return "", fmt.Errorf("%w: expected vX.Y.Z or studioctl/vX.Y.Z", ErrInvalidReleaseVersion)
	}
	return "studioctl/" + version, nil
}

// DefaultAssetName returns the default release asset name for an OS/architecture pair.
func DefaultAssetName(goos, goarch string) (string, error) {
	var osPart string
	switch goos {
	case osLinux:
		osPart = osLinux
	case osDarwin:
		osPart = osDarwin
	case osWindows:
		osPart = osWindows
	default:
		return "", fmt.Errorf("%w: %s", ErrUnsupportedPlatform, goos)
	}

	var archPart string
	switch goarch {
	case "amd64":
		archPart = "amd64"
	case "arm64":
		archPart = "arm64"
	default:
		return "", fmt.Errorf("%w: %s", ErrUnsupportedArchitecture, goarch)
	}

	asset := "studioctl-" + osPart + "-" + archPart
	if goos == osWindows {
		asset += exeSuffix
	}
	return asset, nil
}

// ReleaseURLs returns binary and checksum URLs for the given repository and release.
func ReleaseURLs(repo, version string) (binaryBaseURL, checksumsURL string) {
	base := "https://github.com/" + repo + "/releases/download/" + version
	return base, base + "/SHA256SUMS"
}

func downloadToFile(ctx context.Context, url, path string) (err error) {
	resp, err := getURL(ctx, url)
	if err != nil {
		return err
	}
	defer func() {
		err = errors.Join(err, closeWithError(resp.Body, "close response body"))
	}()

	//nolint:gosec // G304: path points to a temp file path under process control.
	file, err := os.OpenFile(path, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, osutil.FilePermDefault)
	if err != nil {
		return fmt.Errorf("create download file %q: %w", path, err)
	}
	defer func() {
		err = errors.Join(err, closeWithError(file, "close download file"))
	}()

	if _, err := io.Copy(file, resp.Body); err != nil {
		return fmt.Errorf("write download file %q: %w", path, err)
	}

	return nil
}

func verifyAssetChecksum(ctx context.Context, checksumsURL, asset, binaryPath string) error {
	checksums, err := downloadToMemory(ctx, checksumsURL)
	if err != nil {
		return err
	}

	expected, err := ChecksumForAsset(checksums, asset)
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
			ErrChecksumVerificationFailed,
			expected,
			actual,
		)
	}
	return nil
}

func downloadToMemory(ctx context.Context, url string) (data []byte, err error) {
	resp, err := getURL(ctx, url)
	if err != nil {
		return nil, err
	}
	defer func() {
		err = errors.Join(err, closeWithError(resp.Body, "close response body"))
	}()

	data, err = io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response body: %w", err)
	}
	return data, nil
}

func getURL(ctx context.Context, url string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	client := &http.Client{Timeout: httpTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("download %q: %w", url, err)
	}

	if resp.StatusCode != http.StatusOK {
		statusErr := fmt.Errorf("%w: GET %s returned %d", ErrUnexpectedHTTPStatus, url, resp.StatusCode)
		return nil, errors.Join(statusErr, closeWithError(resp.Body, "close response body"))
	}

	return resp, nil
}

// ChecksumForAsset returns SHA256 checksum for the specified asset from a SHA256SUMS file.
func ChecksumForAsset(checksumFile []byte, asset string) (string, error) {
	for line := range strings.SplitSeq(string(checksumFile), "\n") {
		fields := strings.Fields(strings.TrimSpace(line))
		if len(fields) < 2 {
			continue
		}

		sum := strings.ToLower(fields[0])
		name := strings.TrimPrefix(fields[len(fields)-1], "*")
		if name == asset {
			if len(sum) != sha256HexLength {
				break
			}
			return sum, nil
		}
	}

	return "", fmt.Errorf("%w: %s", ErrChecksumAssetNotFound, asset)
}

func fileSHA256(path string) (hashValue string, err error) {
	//nolint:gosec // G304: path points to a freshly downloaded temp file
	file, err := os.Open(path)
	if err != nil {
		return "", fmt.Errorf("open file for checksum %q: %w", path, err)
	}
	defer func() {
		err = errors.Join(err, closeWithError(file, "close checksum file"))
	}()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", fmt.Errorf("hash file %q: %w", path, err)
	}
	return hex.EncodeToString(hash.Sum(nil)), nil
}

func closeWithError(closer io.Closer, action string) error {
	if err := closer.Close(); err != nil {
		return fmt.Errorf("%s: %w", action, err)
	}
	return nil
}

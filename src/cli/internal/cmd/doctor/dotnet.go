package doctor

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"altinn.studio/devenv/pkg/processutil"
	appsvc "altinn.studio/studioctl/internal/cmd/app"
)

// The lowest .NET SDK each major version of the app libraries builds with. Doctor states them outside an app, where
// it cannot tell which version the developer will work on.
const (
	DotnetSDKForV8Apps = "8.0"
	DotnetSDKForV9Apps = "11.0"
)

const (
	globalJSONFileName = "global.json"
	// defaultRollForward is the policy dotnet applies to a global.json that names a version and no policy.
	defaultRollForward = "latestPatch"
)

var (
	errDotnetNoGlobalJSONMatch = errors.New("no installed .NET SDK matches global.json")
	errDotnetTooOldForApp      = errors.New(".NET SDK too old for the app")

	// targetFrameworkPattern matches the frameworks an SDK version maps to: net8.0, net11.0, net8.0-windows and the
	// older netcoreapp3.1. netstandard and .NET Framework monikers do not match.
	targetFrameworkPattern = regexp.MustCompile(`^net(?:coreapp)?(\d+)\.(\d+)`)
)

// DotnetRequirement is what the app in the current directory needs from the .NET SDK. dotnet selects the SDK by the
// first global.json it finds from the directory it runs in upwards, and `run` builds in the project's directory, so
// that is where doctor looks too. A v9 app gets no global.json from its template, so for most apps the target
// framework is the requirement.
type DotnetRequirement struct {
	Project         string `json:"project"`
	TargetFramework string `json:"targetFramework,omitempty"`
	// MinimumSDK is the lowest SDK major.minor that builds TargetFramework.
	MinimumSDK  string `json:"minimumSdk,omitempty"`
	GlobalJSON  string `json:"globalJson,omitempty"`
	SDKVersion  string `json:"sdkVersion,omitempty"`
	RollForward string `json:"rollForward,omitempty"`
}

// probeDotnet checks the .NET SDK the app needs when doctor runs inside one, and the lowest SDK any app builds with
// otherwise. Inside an app it asks dotnet which SDK it selects in the project's directory rather than resolving
// global.json itself: dotnet applies the version, the roll-forward policy, prerelease handling and SDK paths the
// same way when it builds the app.
func (s *Service) probeDotnet(ctx context.Context, app *App) (string, *DotnetRequirement, error) {
	if app == nil || !app.Found {
		version, err := s.probeDotnetVersion(ctx)
		return version, nil, err
	}

	requirement, readErr := readDotnetRequirement(app.Path)
	if readErr != nil {
		s.debugf("reading the .NET SDK the app needs: %v", readErr)
	}
	if requirement == nil || (requirement.MinimumSDK == "" && requirement.SDKVersion == "") {
		version, err := s.probeDotnetVersion(ctx)
		return version, nil, err
	}

	output, err := s.runDotnetVersionIn(ctx, filepath.Dir(requirement.Project))
	if err != nil {
		var exitErr *exec.ExitError
		if requirement.SDKVersion != "" && errors.As(err, &exitErr) {
			return "", requirement, fmt.Errorf(
				"%w: %s requests %s with rollForward %s",
				errDotnetNoGlobalJSONMatch,
				requirement.GlobalJSON,
				requirement.SDKVersion,
				requirement.RollForward,
			)
		}
		return "", requirement, fmt.Errorf("checking dotnet version: %w", err)
	}

	version := lastLine(output)
	if requirement.MinimumSDK != "" && !sdkBuildsFramework(version, requirement.MinimumSDK) {
		return version, requirement, fmt.Errorf(
			"%w: %s needs SDK %s or later, dotnet selects %s",
			errDotnetTooOldForApp,
			requirement.TargetFramework,
			requirement.MinimumSDK,
			version,
		)
	}
	return version, requirement, nil
}

// probeDotnetVersion checks the SDK dotnet selects in the current directory against the lowest any app needs.
func (s *Service) probeDotnetVersion(ctx context.Context) (string, error) {
	output, err := s.runVersionOutput(ctx, "dotnet")
	if err != nil {
		return "", fmt.Errorf("checking dotnet version: %w", err)
	}

	version := strings.TrimSpace(string(output))
	major := extractMajorVersion(version)
	if major < minDotnetMajorVersion {
		return version, errDotnetVersionTooOld
	}

	return version, nil
}

func (s *Service) runDotnetVersionIn(ctx context.Context, dir string) ([]byte, error) {
	if s != nil && s.dotnetVersionIn != nil {
		return s.dotnetVersionIn(ctx, dir)
	}
	return dotnetVersionInDir(ctx, dir)
}

func dotnetVersionInDir(ctx context.Context, dir string) ([]byte, error) {
	cmd := processutil.CommandContext(ctx, "dotnet", "--version")
	cmd.Dir = dir
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("run dotnet --version in %s: %w", dir, err)
	}
	return output, nil
}

// readDotnetRequirement reads the target framework from the app's project file and the SDK version from the
// global.json dotnet uses for it. A field it cannot read is left empty, and the check skips it.
func readDotnetRequirement(appRoot string) (*DotnetRequirement, error) {
	project, err := appsvc.ProjectPath(appRoot)
	if err != nil {
		return nil, fmt.Errorf("find app project: %w", err)
	}

	requirement := &DotnetRequirement{
		Project:         project,
		TargetFramework: "",
		MinimumSDK:      "",
		GlobalJSON:      "",
		SDKVersion:      "",
		RollForward:     "",
	}

	var errs []error
	framework, err := readTargetFramework(project)
	if err != nil {
		errs = append(errs, err)
	} else if major, minor, ok := targetFrameworkVersion(framework); ok {
		requirement.TargetFramework = framework
		requirement.MinimumSDK = strconv.Itoa(major) + "." + strconv.Itoa(minor)
	}

	globalJSON, version, rollForward, err := readGlobalJSON(filepath.Dir(project))
	if err != nil {
		errs = append(errs, err)
	} else if version != "" {
		requirement.GlobalJSON = globalJSON
		requirement.SDKVersion = version
		requirement.RollForward = rollForward
	}

	return requirement, errors.Join(errs...)
}

// readTargetFramework returns the framework the project builds for, or the highest of several. A value set through
// an MSBuild property, or outside the project file, is not read.
func readTargetFramework(project string) (string, error) {
	data, err := os.ReadFile(project) //nolint:gosec // The project path is the detected app's project file.
	if err != nil {
		return "", fmt.Errorf("read app project: %w", err)
	}
	frameworks, err := projectTargetFrameworks(data)
	if err != nil {
		return "", fmt.Errorf("parse app project: %w", err)
	}

	highest := ""
	highestMajor, highestMinor := -1, -1
	for _, framework := range frameworks {
		major, minor, ok := targetFrameworkVersion(framework)
		if ok && (major > highestMajor || (major == highestMajor && minor > highestMinor)) {
			highest, highestMajor, highestMinor = framework, major, minor
		}
	}
	return highest, nil
}

// projectTargetFrameworks returns every framework a project file's TargetFramework and TargetFrameworks name.
func projectTargetFrameworks(data []byte) ([]string, error) {
	decoder := xml.NewDecoder(bytes.NewReader(data))
	var frameworks []string
	for {
		token, err := decoder.Token()
		if errors.Is(err, io.EOF) {
			return frameworks, nil
		}
		if err != nil {
			return nil, fmt.Errorf("read project xml: %w", err)
		}

		start, ok := token.(xml.StartElement)
		if !ok || (start.Name.Local != "TargetFramework" && start.Name.Local != "TargetFrameworks") {
			continue
		}
		var value string
		if err := decoder.DecodeElement(&value, &start); err != nil {
			return nil, fmt.Errorf("read %s: %w", start.Name.Local, err)
		}
		for framework := range strings.SplitSeq(value, ";") {
			if framework = strings.TrimSpace(framework); framework != "" {
				frameworks = append(frameworks, framework)
			}
		}
	}
}

func targetFrameworkVersion(framework string) (int, int, bool) {
	match := targetFrameworkPattern.FindStringSubmatch(strings.ToLower(framework))
	if match == nil {
		return 0, 0, false
	}
	major, majorErr := strconv.Atoi(match[1])
	minor, minorErr := strconv.Atoi(match[2])
	if majorErr != nil || minorErr != nil {
		return 0, 0, false
	}
	return major, minor, true
}

// readGlobalJSON finds the global.json dotnet uses in dir, the first one from dir upwards, and returns its path and
// the SDK version and roll-forward policy it asks for. A global.json without a version leaves the choice to dotnet,
// which then takes the newest SDK, and is reported as none.
func readGlobalJSON(dir string) (string, string, string, error) {
	for current := dir; ; {
		path := filepath.Join(current, globalJSONFileName)
		data, err := os.ReadFile(path) //nolint:gosec // The path is a fixed file name in a parent of the app project.
		switch {
		case err == nil:
			version, rollForward, parseErr := parseGlobalJSON(data)
			if parseErr != nil {
				return path, "", "", fmt.Errorf("parse %s: %w", path, parseErr)
			}
			return path, version, rollForward, nil
		case !errors.Is(err, os.ErrNotExist):
			return "", "", "", fmt.Errorf("read %s: %w", path, err)
		}

		parent := filepath.Dir(current)
		if parent == current {
			return "", "", "", nil
		}
		current = parent
	}
}

func parseGlobalJSON(data []byte) (string, string, error) {
	var file struct {
		SDK struct {
			Version     string `json:"version"`
			RollForward string `json:"rollForward"`
		} `json:"sdk"`
	}
	if err := json.Unmarshal(data, &file); err != nil {
		return "", "", fmt.Errorf("decode global.json: %w", err)
	}

	version := strings.TrimSpace(file.SDK.Version)
	if version == "" {
		return "", "", nil
	}
	rollForward := strings.TrimSpace(file.SDK.RollForward)
	if rollForward == "" {
		rollForward = defaultRollForward
	}
	return version, rollForward, nil
}

// sdkBuildsFramework reports whether an SDK version, such as 11.0.100 or 11.0.100-rc.2.25502.107, builds a target
// framework whose lowest SDK is minimum, such as 11.0. An SDK builds its own framework version and every older one.
func sdkBuildsFramework(version, minimum string) bool {
	sdkMajor, sdkMinor, ok := majorMinor(version)
	if !ok {
		return false
	}
	minMajor, minMinor, ok := majorMinor(minimum)
	if !ok {
		return false
	}
	return sdkMajor > minMajor || (sdkMajor == minMajor && sdkMinor >= minMinor)
}

func majorMinor(version string) (int, int, bool) {
	parts := strings.Split(version, ".")
	if len(parts) < 2 {
		return 0, 0, false
	}
	major, majorErr := strconv.Atoi(parts[0])
	minor, minorErr := strconv.Atoi(parts[1])
	if majorErr != nil || minorErr != nil {
		return 0, 0, false
	}
	return major, minor, true
}

func lastLine(output []byte) string {
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	return strings.TrimSpace(lines[len(lines)-1])
}

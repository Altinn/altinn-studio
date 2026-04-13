package appimage

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	pathpkg "path"
	"path/filepath"
	"slices"
	"strings"
)

const dotnetSDKImage = "mcr.microsoft.com/dotnet/sdk:8.0-alpine"

const dockerfileCopyMinFields = 4

var (
	errUnsupportedAppDockerfile = errors.New("unsupported app Dockerfile")
	errExpectedMultiStage       = errors.New("expected a multi-stage Dockerfile")
)

func generateDockerfile(runRepo repoContext) (string, error) {
	appProjectRel, err := relPathWithin(runRepo.BuildRoot, runRepo.AppProject)
	if err != nil {
		return "", err
	}
	finalStage, err := appDockerfileFinalStage(runRepo.AppRoot)
	if err != nil {
		return "", err
	}

	var b strings.Builder
	b.WriteString("FROM " + dotnetSDKImage + " AS restore\n")
	b.WriteString("WORKDIR /repo\n")
	for _, file := range runRepo.ProjectFiles {
		if err := writeCopyFile(&b, runRepo.BuildRoot, file); err != nil {
			return "", err
		}
	}
	for _, file := range runRepo.MetadataFiles {
		if err := writeCopyFile(&b, runRepo.BuildRoot, file); err != nil {
			return "", err
		}
	}
	if err := writeRun(&b, "dotnet", "restore", appProjectRel); err != nil {
		return "", err
	}
	b.WriteByte('\n')

	b.WriteString("FROM restore AS build\n")
	for _, dir := range runRepo.SourceDirs {
		if err := writeCopyDir(&b, runRepo.BuildRoot, dir); err != nil {
			return "", err
		}
	}
	if err := writeRun(
		&b,
		"dotnet",
		"publish",
		appProjectRel,
		"-c",
		"Release",
		"-o",
		"/app_output",
		"-p:CSharpier_Bypass=true",
		"--no-restore",
	); err != nil {
		return "", err
	}
	if err := writeAppConfigCopy(&b, runRepo); err != nil {
		return "", err
	}
	b.WriteByte('\n')

	b.WriteString(finalStage)
	return b.String(), nil
}

func appDockerfileFinalStage(appRoot string) (string, error) {
	dockerfile := filepath.Join(appRoot, "Dockerfile")
	//nolint:gosec // G304: appRoot comes from repository detection and is constrained before use.
	data, err := os.ReadFile(dockerfile)
	if err != nil {
		return "", fmt.Errorf("read app Dockerfile: %w", err)
	}

	start, err := finalStageStart(data)
	if err != nil {
		return "", fmt.Errorf("%w: %s: %w", errUnsupportedAppDockerfile, dockerfile, err)
	}
	stage := string(data[start:])
	if !strings.HasSuffix(stage, "\n") {
		stage += "\n"
	}
	if !finalStageCopiesGeneratedBuildOutput(stage) {
		return "", fmt.Errorf(
			"%w: %s: final stage must copy /app_output from build stage",
			errUnsupportedAppDockerfile,
			dockerfile,
		)
	}
	return stage, nil
}

func finalStageStart(data []byte) (int, error) {
	fromCount := 0
	finalFromStart := -1
	offset := 0
	continued := false
	for _, line := range bytes.SplitAfter(data, []byte("\n")) {
		if !continued && isDockerfileInstruction(line, "FROM") {
			fromCount++
			finalFromStart = offset
		}
		continued = dockerfileLineContinues(string(line))
		offset += len(line)
	}
	if fromCount < 2 {
		return 0, errExpectedMultiStage
	}
	return finalFromStart, nil
}

func finalStageCopiesGeneratedBuildOutput(stage string) bool {
	return slices.ContainsFunc(dockerfileInstructions(stage), copyFromBuildOutput)
}

func dockerfileInstructions(content string) []string {
	var instructions []string
	var current strings.Builder

	for line := range strings.SplitSeq(content, "\n") {
		trimmed := strings.TrimSpace(line)
		if current.Len() == 0 && (trimmed == "" || strings.HasPrefix(trimmed, "#")) {
			continue
		}

		current.WriteString(line)
		if dockerfileLineContinues(line) {
			current.WriteByte('\n')
			continue
		}
		instructions = append(instructions, current.String())
		current.Reset()
	}
	if current.Len() > 0 {
		instructions = append(instructions, current.String())
	}

	return instructions
}

func copyFromBuildOutput(instruction string) bool {
	if !isDockerfileInstruction([]byte(instruction), "COPY") {
		return false
	}

	fields := strings.Fields(instruction)
	if len(fields) < dockerfileCopyMinFields {
		return false
	}

	hasBuildSource := false
	for _, field := range fields[1:] {
		if strings.EqualFold(field, "--from=build") {
			hasBuildSource = true
			continue
		}
		if hasBuildSource && pathpkg.Clean(strings.Trim(field, `"'`)) == "/app_output" {
			return true
		}
	}
	return false
}

func isDockerfileInstruction(line []byte, instruction string) bool {
	trimmed := strings.TrimLeft(string(line), " \t")
	if trimmed == "" || strings.HasPrefix(trimmed, "#") {
		return false
	}

	fields := strings.Fields(trimmed)
	return len(fields) > 0 && strings.EqualFold(fields[0], instruction)
}

func dockerfileLineContinues(line string) bool {
	trimmed := strings.TrimRight(line, " \t\r")
	return strings.HasSuffix(trimmed, "\\")
}

func writeCopyFile(b *strings.Builder, contextRoot, path string) error {
	rel, err := relPathWithin(contextRoot, path)
	if err != nil {
		return err
	}
	return writeDockerfileInstruction(b, "COPY", rel, filepath.ToSlash(filepath.Dir(rel))+"/")
}

func writeCopyDir(b *strings.Builder, contextRoot, path string) error {
	rel, err := relPathWithin(contextRoot, path)
	if err != nil {
		return err
	}
	if rel == "." {
		return fmt.Errorf("%w: %s", errProjectReferenceOutsideContext, path)
	}
	return writeDockerfileInstruction(b, "COPY", rel+"/", rel+"/")
}

func writeAppConfigCopy(b *strings.Builder, runRepo repoContext) error {
	configDir := filepath.Join(runRepo.AppRoot, "App", "config")
	if !dirExists(configDir) {
		return nil
	}

	rel, err := relPathWithin(runRepo.BuildRoot, configDir)
	if err != nil {
		return err
	}

	return writeRun(b, "sh", "-c", "rm -rf /app_output/config && cp -R "+shellQuote("/repo/"+rel)+" /app_output/config")
}

func writeRun(b *strings.Builder, args ...string) error {
	return writeDockerfileInstruction(b, "RUN", args...)
}

func writeDockerfileInstruction(b *strings.Builder, instruction string, args ...string) error {
	encoded, err := json.Marshal(args)
	if err != nil {
		return fmt.Errorf("encode dockerfile instruction: %w", err)
	}
	b.WriteString(instruction)
	b.WriteByte(' ')
	b.Write(encoded)
	b.WriteByte('\n')
	return nil
}

func shellQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "'\"'\"'") + "'"
}

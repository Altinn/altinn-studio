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
	errDockerfileStageNotFound  = errors.New("dockerfile stage not found")
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

func appDockerfileWithConfigCopy(runRepo repoContext) (string, bool, error) {
	instruction, ok, err := appConfigCopyInstruction(runRepo)
	if err != nil {
		return "", false, err
	}
	if !ok {
		return "", false, nil
	}

	dockerfile := filepath.Join(runRepo.AppRoot, "Dockerfile")
	//nolint:gosec // G304: appRoot comes from repository detection and is constrained before use.
	data, err := os.ReadFile(dockerfile)
	if err != nil {
		return "", false, fmt.Errorf("read app Dockerfile: %w", err)
	}
	if dockerfileCopiesAppConfigToOutput(string(data)) {
		return "", false, nil
	}
	insertAt, err := namedStageEnd(data, "build")
	if err != nil {
		return "", false, fmt.Errorf("%w: %s: %w", errUnsupportedAppDockerfile, dockerfile, err)
	}

	var b strings.Builder
	b.Grow(len(data) + len(instruction) + 1)
	b.Write(data[:insertAt])
	if insertAt > 0 && data[insertAt-1] != '\n' {
		b.WriteByte('\n')
	}
	b.WriteString(instruction)
	b.Write(data[insertAt:])
	return b.String(), true, nil
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

func namedStageEnd(data []byte, stageName string) (int, error) {
	stageStart, err := namedStageStart(data, stageName)
	if err != nil {
		return 0, err
	}

	offset := stageStart
	continued := false
	for _, line := range bytes.SplitAfter(data[stageStart:], []byte("\n")) {
		if offset > stageStart && !continued && isDockerfileInstruction(line, "FROM") {
			return offset, nil
		}
		continued = dockerfileLineContinues(string(line))
		offset += len(line)
	}
	return len(data), nil
}

func namedStageStart(data []byte, stageName string) (int, error) {
	offset := 0
	continued := false
	for _, line := range bytes.SplitAfter(data, []byte("\n")) {
		if !continued && isNamedStage(line, stageName) {
			return offset, nil
		}
		continued = dockerfileLineContinues(string(line))
		offset += len(line)
	}
	return 0, fmt.Errorf("%w: %s", errDockerfileStageNotFound, stageName)
}

func isNamedStage(line []byte, stageName string) bool {
	if !isDockerfileInstruction(line, "FROM") {
		return false
	}

	fields := strings.Fields(string(line))
	for i := 1; i+1 < len(fields); i++ {
		if strings.EqualFold(fields[i], "AS") && strings.EqualFold(fields[i+1], stageName) {
			return true
		}
	}
	return false
}

func finalStageCopiesGeneratedBuildOutput(stage string) bool {
	return slices.ContainsFunc(dockerfileInstructions(stage), copyFromBuildOutput)
}

func dockerfileCopiesAppConfigToOutput(content string) bool {
	return slices.ContainsFunc(dockerfileInstructions(content), copyAppConfigToOutput)
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

func copyAppConfigToOutput(instruction string) bool {
	if !isDockerfileInstruction([]byte(instruction), "COPY") {
		return false
	}

	paths, ok := copyInstructionPaths(instruction)
	if !ok || len(paths) < 2 {
		return false
	}

	dest := normalizeDockerfilePath(paths[len(paths)-1])
	if dest != "/app_output/config" {
		return false
	}

	for _, source := range paths[:len(paths)-1] {
		if normalizeDockerfileSourcePath(source) == "App/config" {
			return true
		}
	}
	return false
}

func copyInstructionPaths(instruction string) ([]string, bool) {
	trimmed := strings.TrimSpace(instruction)
	fields := strings.Fields(trimmed)
	if len(fields) < 2 || !strings.EqualFold(fields[0], "COPY") {
		return nil, false
	}

	rest := strings.TrimSpace(strings.TrimPrefix(trimmed, fields[0]))
	if strings.HasPrefix(rest, "[") {
		var paths []string
		if err := json.Unmarshal([]byte(rest), &paths); err != nil {
			return nil, false
		}
		return paths, true
	}

	paths := fields[1:]
	for len(paths) > 0 && strings.HasPrefix(paths[0], "--") {
		paths = paths[1:]
	}
	return paths, true
}

func normalizeDockerfileSourcePath(path string) string {
	path = strings.TrimPrefix(normalizeDockerfilePath(path), "/")
	path = strings.TrimPrefix(path, "./")
	return pathpkg.Clean(path)
}

func normalizeDockerfilePath(path string) string {
	path = strings.Trim(path, `"'`)
	path = strings.TrimSuffix(path, "/")
	if path == "" {
		return "."
	}
	return pathpkg.Clean(path)
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
	instruction, ok, err := appConfigCopyInstruction(runRepo)
	if err != nil {
		return err
	}
	if !ok {
		return nil
	}
	b.WriteString(instruction)
	return nil
}

func appConfigCopyInstruction(runRepo repoContext) (string, bool, error) {
	configDir := filepath.Join(runRepo.AppRoot, "App", "config")
	if !dirExists(configDir) {
		return "", false, nil
	}

	rel, err := relPathWithin(runRepo.BuildRoot, configDir)
	if err != nil {
		return "", false, err
	}

	var b strings.Builder
	if err := writeDockerfileInstruction(&b, "COPY", filepath.ToSlash(rel)+"/", "/app_output/config/"); err != nil {
		return "", false, err
	}

	return b.String(), true, nil
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

package run

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"

	"altinn.studio/studioctl/internal/appcontainers"
)

const dotnetSDKImage = "mcr.microsoft.com/dotnet/sdk:8.0-alpine"
const dotnetRuntimeImage = "mcr.microsoft.com/dotnet/aspnet:8.0-alpine"

func generateDockerfile(runRepo repoContext) (string, error) {
	appProjectRel, err := relPathWithin(runRepo.BuildRoot, runRepo.AppProject)
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
	b.WriteByte('\n')

	b.WriteString("FROM " + dotnetRuntimeImage + " AS final\n")
	b.WriteString("EXPOSE " + appcontainers.DefaultContainerPort + "\n")
	b.WriteString("WORKDIR /app\n")
	b.WriteString("COPY --from=build /app_output .\n")
	b.WriteString("RUN addgroup -g 3000 dotnet && adduser -u 1000 -G dotnet -D -s /bin/false dotnet\n")
	b.WriteString("USER dotnet\n")
	b.WriteString("RUN mkdir /tmp/logtelemetry\n")
	if err := writeDockerfileInstruction(&b, "ENTRYPOINT", "dotnet", runRepo.AssemblyName+".dll"); err != nil {
		return "", err
	}
	return b.String(), nil
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

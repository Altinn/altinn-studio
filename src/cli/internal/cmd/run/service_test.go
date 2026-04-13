package run_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	runsvc "altinn.studio/studioctl/internal/cmd/run"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/osutil"
)

func TestBuildDockerRunSpec_GeneratesDockerfileForStudioRepoApp(t *testing.T) {
	t.Parallel()

	studioRoot := t.TempDir()
	srcRoot := filepath.Join(studioRoot, "src")
	appRoot := filepath.Join(srcRoot, "test", "apps", "frontend-test")
	appProject := filepath.Join(appRoot, "App", "App.csproj")
	apiProject := filepath.Join(srcRoot, "App", "backend", "src", "Altinn.App.Api", "Altinn.App.Api.csproj")
	coreProject := filepath.Join(srcRoot, "App", "backend", "src", "Altinn.App.Core", "Altinn.App.Core.csproj")
	writeTestFile(t, appProject, `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <AssemblyName>Altinn.App</AssemblyName>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="../../../../App/backend/src/Altinn.App.Api/Altinn.App.Api.csproj" />
  </ItemGroup>
</Project>`)
	writeTestFile(t, apiProject, `<Project Sdk="Microsoft.NET.Sdk">
  <ItemGroup>
    <ProjectReference Include="../Altinn.App.Core/Altinn.App.Core.csproj" />
  </ItemGroup>
</Project>`)
	writeTestFile(t, coreProject, `<Project Sdk="Microsoft.NET.Sdk" />`)
	writeTestFile(t, filepath.Join(srcRoot, "App", "backend", "Directory.Packages.props"), "<Project />")

	spec, err := runsvc.NewService().BuildDockerRunSpec(repocontext.Detection{
		AppRoot:      appRoot,
		StudioRoot:   studioRoot,
		InAppRepo:    true,
		InStudioRepo: true,
	}, nil, false)
	if err != nil {
		t.Fatalf("BuildDockerRunSpec() error = %v", err)
	}

	if spec.ContextPath != srcRoot {
		t.Fatalf("ContextPath = %q, want %q", spec.ContextPath, srcRoot)
	}
	if spec.Dockerfile != "" {
		t.Fatalf("Dockerfile = %q, want generated dockerfile", spec.Dockerfile)
	}
	assertContainsAll(t, spec.DockerfileContent, []string{
		"FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS restore",
		`COPY ["test/apps/frontend-test/App/App.csproj","test/apps/frontend-test/App/"]`,
		`COPY ["App/backend/src/Altinn.App.Api/Altinn.App.Api.csproj","App/backend/src/Altinn.App.Api/"]`,
		`COPY ["App/backend/src/Altinn.App.Core/Altinn.App.Core.csproj","App/backend/src/Altinn.App.Core/"]`,
		`COPY ["App/backend/Directory.Packages.props","App/backend/"]`,
		`RUN ["dotnet","restore","test/apps/frontend-test/App/App.csproj"]`,
		"FROM restore AS build",
		`COPY ["test/apps/frontend-test/App/","test/apps/frontend-test/App/"]`,
		`COPY ["App/backend/src/Altinn.App.Api/","App/backend/src/Altinn.App.Api/"]`,
		`COPY ["App/backend/src/Altinn.App.Core/","App/backend/src/Altinn.App.Core/"]`,
		`RUN ["dotnet","publish","test/apps/frontend-test/App/App.csproj","-c","Release","-o","/app_output","-p:CSharpier_Bypass=true","--no-restore"]`,
		`ENTRYPOINT ["dotnet","Altinn.App.dll"]`,
	})
	if strings.Contains(spec.DockerfileContent, "COPY . .") {
		t.Fatal("generated Dockerfile must not copy the full context")
	}
	assertEnvContainsAll(t, spec.Config.Env, []string{
		"AppSettings__OpenIdWellKnownEndpoint=http://localtest:5101/authentication/api/v1/openid/",
		"OTEL_EXPORTER_OTLP_ENDPOINT=http://monitoring_otel_collector:4317",
		"PlatformSettings__ApiStorageEndpoint=http://localtest:5101/storage/api/v1/",
		"PlatformSettings__ApiPdf2Endpoint=http://localtest-pdf3:5031/pdf",
	})
}

func TestBuildDockerRunSpec_GeneratedDockerfileDefaultsEntryPointToProjectName(t *testing.T) {
	t.Parallel()

	studioRoot := t.TempDir()
	srcRoot := filepath.Join(studioRoot, "src")
	appRoot := filepath.Join(srcRoot, "test", "apps", "default-assembly-name-test")
	writeTestFile(t, filepath.Join(appRoot, "App", "App.csproj"), `<Project Sdk="Microsoft.NET.Sdk.Web" />`)

	spec, err := runsvc.NewService().BuildDockerRunSpec(repocontext.Detection{
		AppRoot:      appRoot,
		StudioRoot:   studioRoot,
		InAppRepo:    true,
		InStudioRepo: true,
	}, nil, false)
	if err != nil {
		t.Fatalf("BuildDockerRunSpec() error = %v", err)
	}

	assertContainsAll(t, spec.DockerfileContent, []string{
		`ENTRYPOINT ["dotnet","App.dll"]`,
	})
}

func TestBuildDockerRunSpec_StandaloneAppUsesAppDockerfile(t *testing.T) {
	t.Parallel()

	appRoot := t.TempDir()
	spec, err := runsvc.NewService().BuildDockerRunSpec(repocontext.Detection{
		AppRoot:   appRoot,
		InAppRepo: true,
	}, nil, false)
	if err != nil {
		t.Fatalf("BuildDockerRunSpec() error = %v", err)
	}

	if spec.ContextPath != appRoot {
		t.Fatalf("ContextPath = %q, want %q", spec.ContextPath, appRoot)
	}
	wantDockerfile := filepath.Join(appRoot, "Dockerfile")
	if spec.Dockerfile != wantDockerfile {
		t.Fatalf("Dockerfile = %q, want %q", spec.Dockerfile, wantDockerfile)
	}
	if spec.DockerfileContent != "" {
		t.Fatalf("DockerfileContent = %q, want empty", spec.DockerfileContent)
	}
}

func assertContainsAll(t *testing.T, value string, want []string) {
	t.Helper()

	for _, expected := range want {
		if !strings.Contains(value, expected) {
			t.Fatalf("value does not contain %q\n%s", expected, value)
		}
	}
}

func assertEnvContainsAll(t *testing.T, env, want []string) {
	t.Helper()

	seen := make(map[string]struct{}, len(env))
	for _, value := range env {
		seen[value] = struct{}{}
	}
	for _, expected := range want {
		if _, ok := seen[expected]; !ok {
			t.Fatalf("env does not contain %q\n%v", expected, env)
		}
	}
}

func writeTestFile(t *testing.T, path, content string) {
	t.Helper()

	if err := os.MkdirAll(filepath.Dir(path), osutil.DirPermDefault); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), osutil.FilePermDefault); err != nil {
		t.Fatal(err)
	}
}

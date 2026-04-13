package appimage_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"altinn.studio/studioctl/internal/appimage"
	"altinn.studio/studioctl/internal/config"
	repocontext "altinn.studio/studioctl/internal/context"
	"altinn.studio/studioctl/internal/osutil"
)

func TestBuildSpecForApp_GeneratesDockerfileForStudioRepoApp(t *testing.T) {
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
	writeTestFile(t, filepath.Join(appRoot, "App", "config", "authorization", "policy.xml"), "<Policy />")
	writeTestAppDockerfile(t, appRoot, "Altinn.App.dll")

	spec, err := appimage.BuildSpecForApp(repocontext.Detection{
		AppRoot:      appRoot,
		StudioRoot:   studioRoot,
		InAppRepo:    true,
		InStudioRepo: true,
	}, "")
	if err != nil {
		t.Fatalf("BuildSpecForApp() error = %v", err)
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
		`RUN ["sh","-c","rm -rf /app_output/config \u0026\u0026 cp -R '/repo/test/apps/frontend-test/App/config' /app_output/config"]`,
		"FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS final",
		"RUN apk add --no-cache icu-libs tzdata",
		"ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false",
		`ENTRYPOINT ["dotnet","Altinn.App.dll"]`,
	})
	if strings.Contains(spec.DockerfileContent, "COPY . .") {
		t.Fatal("generated Dockerfile must not copy the full context")
	}
}

func TestBuildSpecForApp_GeneratedDockerfileUsesAppDockerfileEntrypoint(t *testing.T) {
	t.Parallel()

	studioRoot := t.TempDir()
	srcRoot := filepath.Join(studioRoot, "src")
	appRoot := filepath.Join(srcRoot, "test", "apps", "custom-entrypoint-test")
	writeTestFile(t, filepath.Join(appRoot, "App", "App.csproj"), `<Project Sdk="Microsoft.NET.Sdk.Web" />`)
	writeTestAppDockerfile(t, appRoot, "Custom.App.dll")

	spec, err := appimage.BuildSpecForApp(repocontext.Detection{
		AppRoot:      appRoot,
		StudioRoot:   studioRoot,
		InAppRepo:    true,
		InStudioRepo: true,
	}, "")
	if err != nil {
		t.Fatalf("BuildSpecForApp() error = %v", err)
	}

	assertContainsAll(t, spec.DockerfileContent, []string{
		`ENTRYPOINT ["dotnet","Custom.App.dll"]`,
	})
}

func TestBuildSpecForApp_GeneratedDockerfileRejectsSingleStageAppDockerfile(t *testing.T) {
	t.Parallel()

	studioRoot := t.TempDir()
	srcRoot := filepath.Join(studioRoot, "src")
	appRoot := filepath.Join(srcRoot, "test", "apps", "single-stage-test")
	writeTestFile(t, filepath.Join(appRoot, "App", "App.csproj"), `<Project Sdk="Microsoft.NET.Sdk.Web" />`)
	writeTestFile(t, filepath.Join(appRoot, "Dockerfile"), "FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine\n")

	_, err := appimage.BuildSpecForApp(repocontext.Detection{
		AppRoot:      appRoot,
		StudioRoot:   studioRoot,
		InAppRepo:    true,
		InStudioRepo: true,
	}, "")
	if err == nil {
		t.Fatal("BuildSpecForApp() error = nil, want error")
	}
	if !strings.Contains(err.Error(), "unsupported app Dockerfile") {
		t.Fatalf("BuildSpecForApp() error = %v, want unsupported app Dockerfile", err)
	}
}

func TestBuildSpecForApp_GeneratedDockerfileRejectsFinalStageWithoutBuildOutputCopy(t *testing.T) {
	t.Parallel()

	studioRoot := t.TempDir()
	srcRoot := filepath.Join(studioRoot, "src")
	appRoot := filepath.Join(srcRoot, "test", "apps", "missing-output-copy-test")
	writeTestFile(t, filepath.Join(appRoot, "App", "App.csproj"), `<Project Sdk="Microsoft.NET.Sdk.Web" />`)
	writeTestFile(t, filepath.Join(appRoot, "Dockerfile"), `FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
RUN dotnet publish App.csproj --configuration Release --output /out

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS final
ENTRYPOINT ["dotnet","App.dll"]
`)

	_, err := appimage.BuildSpecForApp(repocontext.Detection{
		AppRoot:      appRoot,
		StudioRoot:   studioRoot,
		InAppRepo:    true,
		InStudioRepo: true,
	}, "")
	if err == nil {
		t.Fatal("BuildSpecForApp() error = nil, want error")
	}
	if !strings.Contains(err.Error(), "final stage must copy /app_output from build stage") {
		t.Fatalf("BuildSpecForApp() error = %v, want final stage copy error", err)
	}
}

func TestBuildSpecForApp_GeneratedDockerfileUsesAppSpecificCacheRef(t *testing.T) {
	t.Setenv("CI", "true")
	t.Setenv(config.EnvRegistryCacheWrite, "")

	studioRoot := t.TempDir()
	srcRoot := filepath.Join(studioRoot, "src")
	appRoot := filepath.Join(srcRoot, "test", "apps", "frontend-test")
	writeTestFile(t, filepath.Join(appRoot, "App", "App.csproj"), `<Project Sdk="Microsoft.NET.Sdk.Web" />`)
	writeTestAppDockerfile(t, appRoot, "Altinn.Application.dll")

	spec, err := appimage.BuildSpecForApp(repocontext.Detection{
		AppRoot:      appRoot,
		StudioRoot:   studioRoot,
		InAppRepo:    true,
		InStudioRepo: true,
	}, "")
	if err != nil {
		t.Fatalf("BuildSpecForApp() error = %v", err)
	}

	want := "type=registry,ref=ghcr.io/altinn/altinn-studio/app-cache:test-apps-frontend-test"
	if len(spec.Build.CacheFrom) != 1 || spec.Build.CacheFrom[0] != want {
		t.Fatalf("CacheFrom = %#v, want %#v", spec.Build.CacheFrom, []string{want})
	}
}

func TestBuildSpecForApp_StandaloneAppUsesAppDockerfile(t *testing.T) {
	t.Parallel()

	appRoot := t.TempDir()
	spec, err := appimage.BuildSpecForApp(repocontext.Detection{
		AppRoot:   appRoot,
		InAppRepo: true,
	}, "")
	if err != nil {
		t.Fatalf("BuildSpecForApp() error = %v", err)
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

func writeTestFile(t *testing.T, path, content string) {
	t.Helper()

	if err := os.MkdirAll(filepath.Dir(path), osutil.DirPermDefault); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), osutil.FilePermDefault); err != nil {
		t.Fatal(err)
	}
}

func writeTestAppDockerfile(t *testing.T, appRoot, entrypoint string) {
	t.Helper()

	writeTestFile(t, filepath.Join(appRoot, "Dockerfile"), `FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /App
COPY /App .
RUN dotnet publish App.csproj --configuration Release --output /app_output

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS final
EXPOSE 5005
WORKDIR /App
COPY --from=build /app_output .
RUN addgroup -g 3000 dotnet && adduser -u 1000 -G dotnet -D -s /bin/false dotnet
RUN apk add --no-cache icu-libs tzdata
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false
USER dotnet
RUN mkdir /tmp/logtelemetry
ENTRYPOINT ["dotnet","`+entrypoint+`"]
`)
}

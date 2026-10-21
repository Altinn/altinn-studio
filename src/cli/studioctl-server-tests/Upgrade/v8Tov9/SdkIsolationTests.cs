using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Altinn.Studio.StudioctlServer.Platform;
using Microsoft.Build.Locator;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class SdkIsolationTests
{
    [Fact]
    public async Task NewerSdk_RestoresAndCompilesAfterInProcessMSBuildRegistration()
    {
        // SDK 11 and its reference pack are optional on CLI contributors' machines. When installed,
        // this must exercise the real net10 server / net11 app boundary, without a network restore.
        var sdk = await FindNet11Sdk();
        Assert.SkipWhen(sdk is null, "Requires the .NET 11 SDK and Microsoft.NETCore.App.Ref targeting pack.");
        Assert.SkipWhen(Environment.Version.Major >= 11, "Requires a test host on an older runtime than .NET 11.");

        using var app = new TempAppFolder();
        app.Write(
            "../global.json",
            JsonSerializer.Serialize(
                new
                {
                    sdk = new
                    {
                        version = sdk,
                        rollForward = "disable",
                        allowPrerelease = true,
                    },
                }
            )
        );
        app.Write("../NuGet.Config", "<configuration><packageSources><clear /></packageSources></configuration>");
        var projectFile = app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>net11.0</TargetFramework>
                <NuGetAudit>false</NuGetAudit>
              </PropertyGroup>
              <ItemGroup>
                <ProjectReference Include="../Core/Core.csproj" />
              </ItemGroup>
            </Project>
            """
        );
        app.Write(
            "App.cs",
            "public class App { public CoreType Core; public System.Threading.CancellationToken Token; }"
        );
        app.Write(
            "../Core/Core.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>net11.0</TargetFramework>
                <NuGetAudit>false</NuGetAudit>
              </PropertyGroup>
            </Project>
            """
        );
        app.Write("../Core/CoreType.cs", "public class CoreType { }");
        var tests = app.Write(
            "../Tests/Tests.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup>
              <ItemGroup><ProjectReference Include="../App/App.csproj" /></ItemGroup>
            </Project>
            """
        );

        var report = new UpgradeReport();
        using (UpgradeConsole.Use(report, TextWriter.Null))
        {
            UpgradeConsole.BeginStep("Dependent projects");
            Assert.Equal(0, await DependentProjectsMigration.Migrate(app.Root, projectFile));
        }
        Assert.True(MSBuildLocator.IsRegistered);
        Assert.Contains("net11.0", await File.ReadAllTextAsync(tests, TestContext.Current.CancellationToken));

        // The process still needs its registered SDK. Only the child environment should change.
        var registeredSdk = Environment.GetEnvironmentVariable("MSBuildSDKsPath");
        Assert.NotNull(registeredSdk);
        Assert.NotEqual(sdk, Path.GetFileName(Path.GetDirectoryName(registeredSdk)));
        var startInfo = ProcessUtil.CreateDotnetStartInfo("restore", projectFile, "--disable-build-servers", "-m:1");
        Assert.DoesNotContain("MSBUILD_EXE_PATH", startInfo.Environment.Keys);
        Assert.DoesNotContain("MSBuildSDKsPath", startInfo.Environment.Keys);
        Assert.DoesNotContain("MSBuildExtensionsPath", startInfo.Environment.Keys);
        Assert.Equal(registeredSdk, Environment.GetEnvironmentVariable("MSBuildSDKsPath"));

        var downgrades = await new NuGetDowngradeResolver().ResolveAsync(
            app.Root,
            projectFile,
            TestContext.Current.CancellationToken
        );
        Assert.Empty(downgrades.Messages);

        foreach (var configuration in new[] { "Debug", "Release" })
        {
            using var loaded = await ProjectCompilationLoader.LoadAsync(
                app.Root,
                projectFile,
                configuration,
                TestContext.Current.CancellationToken
            );
            Assert.Null(loaded.RestoreError);
            Assert.Empty(loaded.LoadFailures);
            var compilation = Assert.IsAssignableFrom<Compilation>(
                await loaded.Project.GetCompilationAsync(TestContext.Current.CancellationToken)
            );
            Assert.Equal(
                11,
                compilation.GetSpecialType(SpecialType.System_Object).ContainingAssembly.Identity.Version.Major
            );
            Assert.Empty(
                compilation
                    .GetDiagnostics(TestContext.Current.CancellationToken)
                    .Where(diagnostic => diagnostic.Severity == DiagnosticSeverity.Error)
            );
        }
        Assert.Equal(registeredSdk, Environment.GetEnvironmentVariable("MSBuildSDKsPath"));
    }

    private static async Task<string?> FindNet11Sdk()
    {
        var result = await Run(ProcessUtil.CreateDotnetStartInfo("--list-sdks"), Path.GetTempPath());
        Assert.True(result.ExitCode == 0, result.Output);
        foreach (
            Match match in Regex.Matches(result.Output, @"(?m)^11\.(?<version>\S+)\s+\[(?<path>[^\]]+)\]").Reverse()
        )
        {
            var packs = Path.GetFullPath(
                Path.Combine(match.Groups["path"].Value, "..", "packs", "Microsoft.NETCore.App.Ref")
            );
            if (Directory.Exists(packs) && Directory.EnumerateDirectories(packs, "11.*").Any())
                return "11." + match.Groups["version"].Value;
        }
        return null;
    }

    private static async Task<(int ExitCode, string Output)> Run(ProcessStartInfo startInfo, string directory)
    {
        startInfo.WorkingDirectory = directory;
        startInfo.RedirectStandardOutput = true;
        startInfo.RedirectStandardError = true;
        using var process = Process.Start(startInfo) ?? throw new InvalidOperationException("Could not start dotnet.");
        var output = process.StandardOutput.ReadToEndAsync(TestContext.Current.CancellationToken);
        var error = process.StandardError.ReadToEndAsync(TestContext.Current.CancellationToken);
        await process.WaitForExitAsync(TestContext.Current.CancellationToken);
        return (process.ExitCode, await output + await error);
    }
}

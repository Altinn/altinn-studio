using System.ComponentModel;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.StudioctlServer.Studioctl;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class V9SdkRequirementTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Theory]
    [InlineData("11.0.100-rc.2")]
    [InlineData("11.0.100-rc.2.26504.105")]
    [InlineData("11.0.100")]
    [InlineData("11.0.200")]
    [InlineData("12.0.100-preview.1")]
    public async Task FindProblem_CompatibleSelectedSdk_PassesWithoutListingInstalledSdks(string sdk)
    {
        var problem = await FindProblem(new(0, sdk + "\n", ""));

        Assert.Null(problem);
    }

    [Theory]
    [InlineData("11.0.100-rc.1.26425.128")]
    [InlineData("10.0.401")]
    public async Task FindProblem_OldSelectedSdk_RequiresTheMinimumSdk(string sdk)
    {
        var problem = await FindProblem(new(0, sdk, ""), new(0, $"{sdk} [/dotnet/sdk]\n", ""));

        Assert.NotNull(problem);
        Assert.Contains(sdk, problem);
        Assert.Contains(AppUpgradeService.MinimumV9SdkVersion, problem);
        Assert.Contains("https://dotnet.microsoft.com/download/dotnet/11.0", problem);
    }

    [Fact]
    public async Task FindProblem_NewerSdkInstalledButNotSelected_RequiresChangingGlobalJson()
    {
        var globalJson = _app.Write("../global.json", """{ "sdk": { "version": "10.0.401" } }""");

        var problem = await FindProblem(
            new(0, "10.0.401", ""),
            new(0, "10.0.401 [/dotnet/sdk]\n11.0.100-rc.2.26504.105 [/dotnet/sdk]\n", "")
        );

        Assert.NotNull(problem);
        Assert.Contains("10.0.401", problem);
        Assert.Contains(Path.GetFullPath(globalJson), problem);
        Assert.Contains("sdk.version", problem);
        Assert.Contains("11.0.100-rc.2.26504.105", problem);
        Assert.Contains("allowPrerelease", problem);
        Assert.DoesNotContain("https://", problem);
    }

    [Fact]
    public async Task FindProblem_VersionProbeFails_LabelsBothDiagnosticStreamsWithoutListingSdks()
    {
        _app.Write("../global.json", """{ "sdk": { "version": "11.0.100" } }""");
        const string stdout = "8.0.414 [/dotnet/sdk]\n11.0.100-rc.2.26504.105 [/dotnet/sdk]";
        const string stderr =
            "A compatible .NET SDK was not found.\nInstalled SDKs:\nhttps://aka.ms/dotnet/sdk-not-found";

        var problem = await FindProblem(new(155, stdout, stderr));

        Assert.NotNull(problem);
        Assert.Contains("155", problem);
        Assert.EndsWith(
            $"dotnet stderr:{Environment.NewLine}{stderr}{Environment.NewLine}{Environment.NewLine}dotnet stdout:{Environment.NewLine}{stdout}",
            problem
        );
        Assert.Contains(AppUpgradeService.MinimumV9SdkVersion, problem);
        Assert.DoesNotContain("not installed", problem);
        Assert.DoesNotContain("Set sdk.version", problem);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not a version")]
    public async Task FindProblem_VersionProbeSucceedsWithoutAVersion_Refuses(string stdout)
    {
        var problem = await FindProblem(new(0, stdout, ""));

        Assert.NotNull(problem);
        Assert.Contains(_app.Root, problem);
        Assert.Contains(AppUpgradeService.MinimumV9SdkVersion, problem);
        if (stdout.Length > 0)
            Assert.Contains(stdout, problem);
    }

    [Fact]
    public async Task FindProblem_InstalledSdkProbeFails_DoesNotTreatPartialOutputAsAnInventory()
    {
        const string stderr = "Failed to enumerate installed SDK directories.";
        var problem = await FindProblem(
            new(0, "10.0.401", ""),
            new(42, "11.0.100-rc.2.26504.105 [/dotnet/sdk]", stderr)
        );

        Assert.NotNull(problem);
        Assert.Contains("42", problem);
        Assert.Contains(stderr, problem);
        Assert.Contains("11.0.100-rc.2.26504.105 [/dotnet/sdk]", problem);
        Assert.DoesNotContain("Set sdk.version", problem);
        Assert.DoesNotContain("https://dotnet.microsoft.com/download", problem);
    }

    [Fact]
    public async Task FindProblem_InstalledSdkProbeSucceedsWithEmptyInventory_LinksTheDownload()
    {
        var problem = await FindProblem(new(0, "10.0.401", ""), new(0, "", ""));

        Assert.NotNull(problem);
        Assert.Contains("https://dotnet.microsoft.com/download/dotnet/11.0", problem);
    }

    [Fact]
    public async Task FindProblem_DotnetCannotStart_LinksTheRequiredSdk()
    {
        var problem = await V9SdkRequirement.FindProblem(
            _app.Root,
            AppUpgradeService.MinimumV9SdkVersion,
            (_, _, _) => throw new Win32Exception(2),
            TestContext.Current.CancellationToken
        );

        Assert.NotNull(problem);
        Assert.Contains(AppUpgradeService.MinimumV9SdkVersion, problem);
        Assert.Contains("https://dotnet.microsoft.com/download/dotnet/11.0", problem);
    }

    [Fact]
    public async Task FindProblem_NestedGlobalJson_ReportsTheConfigurationUsedFromApp()
    {
        var rootGlobalJson = _app.Write("../global.json", """{ "sdk": { "version": "11.0.100" } }""");
        var appGlobalJson = _app.Write("global.json", """{ "sdk": { "version": "10.0.401" } }""");

        var problem = await FindProblem(
            new(0, "10.0.401", ""),
            new(0, "10.0.401 [/dotnet/sdk]\n11.0.100 [/dotnet/sdk]\n", ""),
            Path.Combine(_app.Root, "App")
        );

        Assert.NotNull(problem);
        Assert.Contains(appGlobalJson, problem);
        Assert.DoesNotContain(Path.GetFullPath(rootGlobalJson), problem);
    }

    [Fact]
    public async Task RunAsync_GlobalJsonPinsAMissingSdk_RefusesBeforeChangingTheApp()
    {
        WriteApp();
        var globalJson = _app.Write(
            "../global.json",
            """{ "sdk": { "version": "999.0.100", "rollForward": "disable" } }"""
        );
        var before = Snapshot();

        var result = await RunUpgrade();

        AssertRefusedWithoutWrites(result, before);
        Assert.Contains(Path.GetFullPath(globalJson), result.Message);
        Assert.Contains("999.0.100", result.Message);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task RunAsync_SdkRequirementFails_RefusesBeforeChangingTheApp(bool appSdkFails)
    {
        WriteApp();
        var appProjectFolder = Path.Combine(_app.Root, "App");
        var calls = new List<(string Directory, string MinimumVersion, CancellationToken CancellationToken)>();
        const string sdkProblem = "SDK requirement failed.";
        var before = Snapshot();

        var result = await RunUpgrade(
            (directory, minimumVersion, cancellationToken) =>
            {
                calls.Add((directory, minimumVersion, cancellationToken));
                return Task.FromResult<string?>(appSdkFails && directory == _app.Root ? null : sdkProblem);
            }
        );

        AssertRefusedWithoutWrites(result, before);
        Assert.Equal(sdkProblem, result.Message);
        var expectedDirectories = appSdkFails ? new[] { _app.Root, appProjectFolder } : new[] { _app.Root };
        Assert.Equal(expectedDirectories, calls.Select(call => call.Directory));
        Assert.All(
            calls,
            call =>
            {
                Assert.Equal(AppUpgradeService.MinimumV9SdkVersion, call.MinimumVersion);
                Assert.Equal(TestContext.Current.CancellationToken, call.CancellationToken);
            }
        );
    }

    [Fact]
    public async Task RunAsync_MissingAppProject_ReportsTheProjectBeforeCheckingTheSdk()
    {
        var sdkChecked = false;

        var result = await RunUpgrade(
            (_, _, _) =>
            {
                sdkChecked = true;
                return Task.FromResult<string?>("SDK requirement failed.");
            }
        );

        Assert.False(sdkChecked);
        Assert.True(result.IsValid);
        Assert.Equal(1, result.ExitCode);
        Assert.Contains("Project file does not exist", result.Error);
        Assert.Contains(Path.Combine(_app.Root, "App/App.csproj"), result.Error);
    }

    private Task<string?> FindProblem(
        V9SdkRequirement.DotnetResult version,
        V9SdkRequirement.DotnetResult? installed = null,
        string? directory = null
    ) =>
        V9SdkRequirement.FindProblem(
            directory ?? _app.Root,
            AppUpgradeService.MinimumV9SdkVersion,
            (workingDirectory, argument, cancellationToken) =>
            {
                Assert.Equal(directory ?? _app.Root, workingDirectory);
                Assert.Equal(TestContext.Current.CancellationToken, cancellationToken);
                return Task.FromResult(
                    argument switch
                    {
                        "--version" => version,
                        "--list-sdks" when installed is { } inventory => inventory,
                        _ => throw new InvalidOperationException($"Unexpected dotnet probe: {argument}"),
                    }
                );
            },
            TestContext.Current.CancellationToken
        );

    private void WriteApp()
    {
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup>
              <ItemGroup><PackageReference Include="Altinn.App.Api" Version="8.7.0" /></ItemGroup>
            </Project>
            """
        );
        _app.Write("Program.cs", "public static class Program { public static void Main() { } }");
        _app.Write("../Dockerfile", "FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build\n");
    }

    private Dictionary<string, byte[]> Snapshot() =>
        Directory
            .EnumerateFiles(_app.Root, "*", SearchOption.AllDirectories)
            .ToDictionary(file => file, File.ReadAllBytes);

    private void AssertRefusedWithoutWrites(AppUpgradeResult result, Dictionary<string, byte[]> before)
    {
        Assert.False(result.IsValid);
        Assert.Equal(1, result.ExitCode);
        Assert.Empty(result.Output);
        Assert.Empty(result.Error);
        Assert.Empty(result.Steps);
        var after = Snapshot();
        Assert.Equal(before.Keys.Order(), after.Keys.Order());
        Assert.All(before, file => Assert.Equal(file.Value, after[file.Key]));
    }

    private async Task<AppUpgradeResult> RunUpgrade(
        Func<string, string, CancellationToken, Task<string?>>? findSdkProblem = null
    )
    {
        using var service = findSdkProblem is null ? new AppUpgradeService() : new AppUpgradeService(findSdkProblem);
        return await service.RunAsync(
            new AppUpgradeRequest(
                UpgradeKinds.V9,
                _app.Root,
                StudioRoot: null,
                ConvertPackageReferences: false,
                AllowDirty: true
            ),
            TestContext.Current.CancellationToken
        );
    }
}

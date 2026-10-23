using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class DotnetRestoreTests
{
    // The first run of an SDK in a home directory prints this to stderr, which follows stdout in the
    // output the upgrade reads. A CI runner with a fresh home and a second SDK prints it in whichever
    // test restores with that SDK first.
    private const string FirstRunBanner = """
        Welcome to .NET 11.0!
        ---------------------
        SDK Version: 11.0.100-rc.2.26504.105

        Telemetry
        ---------
        The .NET tools collect usage data in order to help us improve your experience. It is collected by Microsoft and shared with the community. You can opt-out of telemetry by setting the DOTNET_CLI_TELEMETRY_OPTOUT environment variable to '1' or 'true' using your favorite shell.

        Read more about .NET CLI Tools telemetry: https://aka.ms/dotnet-cli-telemetry

        ----------------
        Installed an ASP.NET Core HTTPS development certificate.
        To trust the certificate, run 'dotnet dev-certs https --trust'
        Learn about HTTPS: https://aka.ms/dotnet-https

        ----------------
        Write your first app: https://aka.ms/dotnet-hello-world
        Find out what's new: https://aka.ms/dotnet-whats-new
        Explore documentation: https://aka.ms/dotnet-docs
        Report issues and find source on GitHub: https://github.com/dotnet/core
        Use 'dotnet --help' to see available commands or visit: https://aka.ms/dotnet-cli
        --------------------------------------------------------------------------------------
        """;

    [Fact]
    public void FindError_SkipsFirstRunBannerAfterTheErrors()
    {
        const string stdout = """
            /app/App/App.csproj : error : Could not resolve SDK "Missing.Sdk". Exactly one of the probing messages below indicates why we could not resolve the SDK. Investigate and resolve that message to correctly specify the SDK.
            /app/App/App.csproj : error :   SDK resolver "Microsoft.DotNet.MSBuildWorkloadSdkResolver" returned null.
            /app/App/App.csproj : error :   The NuGetSdkResolver did not resolve this SDK because there was no version specified in the project or global.json.
            /app/App/App.csproj : error MSB4236: The SDK 'Missing.Sdk' specified could not be found.

            """;

        var error = DotnetRestore.FindError(stdout + "\n" + FirstRunBanner);

        Assert.Equal("/app/App/App.csproj : error MSB4236: The SDK 'Missing.Sdk' specified could not be found.", error);
    }

    [Fact]
    public void FindError_QuotesTheErrorRatherThanItsDetailOrLaterLines()
    {
        const string stdout = """
              Determining projects to restore...
            /app/App/App.csproj : error NU1102: Unable to find package Altinn.App.Core with version (>= 9.0.0)
            /app/App/App.csproj : error NU1102:   - Found 1 version(s) in local [ Nearest version: 8.9.0 ]
            /app/App.Tests/App.Tests.csproj : warning NU1903: Package 'System.Security.Cryptography.Xml' 10.0.10 has a known high severity vulnerability, https://github.com/advisories/GHSA-7hqp-7c5m-4vq6
              Failed to restore /app/App/App.csproj (in 44 ms).
            """;

        var error = DotnetRestore.FindError(stdout);

        Assert.Equal(
            "/app/App/App.csproj : error NU1102: Unable to find package Altinn.App.Core with version (>= 9.0.0)",
            error
        );
    }

    [Theory]
    [InlineData(@"C:\app\App\App.csproj : error MSB4236: The SDK 'Missing.Sdk' specified could not be found.")]
    [InlineData("/app/App/App.csproj(3,5): error MSB4025: The project file could not be loaded.")]
    [InlineData("MSBUILD : error MSB1009: Project file does not exist.")]
    [InlineData("error NU1301: Unable to load the service index for source https://api.nuget.org/v3/index.json.")]
    public void FindError_RecognizesCanonicalErrorLines(string line)
    {
        var output = $"  Determining projects to restore...\r\n{line}\r\n  Failed to restore /app/App/App.csproj.\r\n";

        Assert.Equal(line, DotnetRestore.FindError(output));
    }

    [Fact]
    public void FindError_NoErrorLine_ReturnsNull()
    {
        Assert.Null(DotnetRestore.FindError("  Determining projects to restore...\n\n" + FirstRunBanner));
    }

    [Fact]
    public void FindError_IgnoresProseThatOnlyMentionsAnError()
    {
        Assert.Null(DotnetRestore.FindError("warning: error handling: is fine"));
    }

    [Fact]
    public async Task RunAsync_PrintsEachErrorOnOneLineWhenTheAppTurnsOnTheTerminalLogger()
    {
        using var app = new TempAppFolder();
        app.Write("../NuGet.Config", "<configuration><packageSources><clear /></packageSources></configuration>");
        app.Write("Directory.Build.rsp", "-tl:on");
        var projectFile = app.Write("App.csproj", "<Project Sdk=\"Missing.Sdk\" />");

        var (output, exitCode) = await DotnetRestore.RunAsync(
            app.Root,
            projectFile,
            configuration: null,
            TestContext.Current.CancellationToken
        );

        Assert.NotEqual(0, exitCode);
        Assert.EndsWith(
            " : error MSB4236: The SDK 'Missing.Sdk' specified could not be found.",
            DotnetRestore.FindError(output)
        );
    }
}

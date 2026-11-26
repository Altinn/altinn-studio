using Altinn.Studio.Fleet.Analysis;
using Altinn.Studio.Fleet.Analysis.ApiUsage;
using Altinn.Studio.Fleet.Cli;

namespace Altinn.Studio.Fleet.Tests;

public sealed class CliTests
{
    [Fact]
    public async Task Sync_PrintsASummaryLineAndTheChanges()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        context.Altinn.Deploy("prod", "ttd", "app-two", "2");
        await context.SyncProd();
        string commit = context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.1");

        (int exit, string output, _) = await Run(context, "sync", "--store", context.Root);

        Assert.Equal(0, exit);
        string[] lines = output.TrimEnd().Split('\n');
        Assert.StartsWith(
            "prod  2 deployed · 1 unchanged · 1 updated · 0 added · 0 removed · 0 failed   ",
            lines[0],
            StringComparison.Ordinal
        );
        Assert.Equal($"  updated  ttd/app-one   1.0.0 → 1.0.1   {commit[..7]}", lines[1]);
    }

    [Fact]
    public async Task Query_WritesTableTsvAndJson()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        await context.SyncProd();
        const string Sql = "SELECT app, altinn_app_major AS major, NULL AS missing FROM apps";

        (_, string table, string error) = await Run(context, "query", Sql, "--store", context.Root);
        Assert.Equal("", error);
        (_, string tsv, _) = await Run(context, "query", "--tsv", Sql, "--store", context.Root);
        (_, string json, _) = await Run(context, "query", "--json", "--store", context.Root, Sql);

        Assert.Equal(
            "app      major  missing\n-------  -----  -------\napp-one      8  NULL\n(1 row)\n",
            table.ReplaceLineEndings("\n")
        );
        Assert.Equal("app\tmajor\tmissing\napp-one\t8\t\n", tsv.ReplaceLineEndings("\n"));
        Assert.Equal(
            "[\n  {\n    \"app\": \"app-one\",\n    \"major\": 8,\n    \"missing\": null\n  }\n]\n",
            json.ReplaceLineEndings("\n")
        );
    }

    [Fact]
    public async Task StoreThatCannotBeWritten_IsAnErrorMessage()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        string file = Path.Join(context.Root, "not-a-folder");
        await File.WriteAllTextAsync(file, "", TestContext.Current.CancellationToken);

        (int exit, _, string error) = await Run(context, "sync", "--store", file);

        Assert.Equal(1, exit);
        Assert.StartsWith("fleet: ", error, StringComparison.Ordinal);
        Assert.DoesNotContain(" at ", error, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Query_RefusesToWrite()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        await context.SyncProd();

        (int exit, _, string error) = await Run(context, "query", "DELETE FROM apps", "--store", context.Root);

        Assert.Equal(1, exit);
        Assert.Contains("readonly", error, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("sync", "--env", "at22")]
    [InlineData("sync", "--parallel", "0")]
    [InlineData("sync", "--org", "a b")]
    [InlineData("sync", "--unknown")]
    [InlineData("sync", "--dry-run=yes")]
    [InlineData("frobnicate")]
    [InlineData("query")]
    [InlineData("query", "--env", "all", "SELECT 1")]
    [InlineData("query", "--json", "--tsv", "SELECT 1")]
    [InlineData("query", "--db", "analysis.sqlite", "--env", "prod", "SELECT 1")]
    [InlineData("analysis", "run", "--timeout", "1")]
    [InlineData("analysis", "run", "--parallel", "0")]
    [InlineData("analysis", "run", "api-usage,frobnicate")]
    [InlineData("analysis", "run", "--source", "no-such-checkout")]
    [InlineData("analysis", "api-usage", "surface", "main")]
    [InlineData("analysis", "frobnicate")]
    public async Task InvalidArguments_ExitWithUsageError(params string[] args)
    {
        using var context = new FleetTestContext();

        (int exit, _, string error) = await Run(context, [.. args, "--store", context.Root]);

        Assert.Equal(2, exit);
        Assert.StartsWith("fleet: ", error, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AnalysisRun_WritesAFileThatQueryReadsWithTheIndexes()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        await context.SyncProd();
        string file = Path.Join(context.Outside, "analysis.sqlite");

        (int exit, string output, _) = await Run(
            context,
            new CannedApiUsage(),
            "analysis",
            "run",
            "--out",
            file,
            "--store",
            context.Root
        );
        (_, string tsv, string error) = await Run(
            context,
            "query",
            "--tsv",
            "--db",
            file,
            "--store",
            context.Root,
            "SELECT r.app, a.version, u.symbol FROM runs r JOIN prod.apps a USING (org, app) "
                + "JOIN api_usage_uses u USING (env, org, app)"
        );

        Assert.Equal(0, exit);
        Assert.StartsWith(
            "prod  api-usage  1 apps · 1 analyzed · 0 unchanged · 0 removed · 0 failed",
            output,
            StringComparison.Ordinal
        );
        Assert.Equal("", error);
        Assert.Equal(
            "app\tversion\tsymbol\napp-one\t1.0.0\tT:Altinn.App.Core.Features.IDataProcessor\n",
            tsv.ReplaceLineEndings("\n")
        );
    }

    [Fact]
    public async Task AnalysisRun_RefusesToWriteIntoTheStore()
    {
        using var context = new FleetTestContext();

        (int exit, _, string error) = await Run(
            context,
            "analysis",
            "run",
            "--out",
            Path.Join(context.Root, "analysis.sqlite"),
            "--store",
            context.Root
        );

        Assert.Equal(2, exit);
        Assert.Contains("is in the store", error, StringComparison.Ordinal);
        Assert.False(File.Exists(Path.Join(context.Root, "analysis.sqlite")));
    }

    [Fact]
    public async Task AnalysisRun_RunsAnAnalysisNamedTwiceOnce()
    {
        using var context = new FleetTestContext();
        context.Altinn.Deploy("prod", "ttd", "app-one", "1.0.0");
        await context.SyncProd();

        (int exit, string output, _) = await Run(
            context,
            new CannedApiUsage(),
            "analysis",
            "run",
            "api-usage,api-usage",
            "--out",
            Path.Join(context.Outside, "analysis.sqlite"),
            "--store",
            context.Root
        );

        Assert.Equal(0, exit);
        Assert.Single(output.Split('\n'), line => line.Contains("1 analyzed", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Status_WorksWithoutAStore()
    {
        using var context = new FleetTestContext();

        (int exit, string output, _) = await Run(context, "status", "--store", Path.Join(context.Root, "none"));

        Assert.Equal(0, exit);
        Assert.Contains("prod  not synced", output, StringComparison.Ordinal);
        Assert.Contains("tt02  not synced", output, StringComparison.Ordinal);
    }

    private static Task<(int Exit, string Output, string Error)> Run(FleetTestContext context, params string[] args) =>
        Run(context, null, args);

    private static async Task<(int Exit, string Output, string Error)> Run(
        FleetTestContext context,
        IAnalysisExecutor? executor,
        params string[] args
    )
    {
        using var output = new StringWriter();
        using var error = new StringWriter();
        int exit = await Cli.Cli.Run(
            args,
            output,
            error,
            TestContext.Current.CancellationToken,
            context.Credentials,
            context.Altinn,
            executor
        );
        return (exit, output.ToString(), error.ToString());
    }

    /// <summary>Writes the result of an api-usage analysis without building the app.</summary>
    private sealed class CannedApiUsage : IAnalysisExecutor
    {
        public async Task<string?> Run(
            IAppAnalysis analysis,
            string appDir,
            string resultFile,
            CancellationToken cancellationToken
        )
        {
            var usage = new AppUsage(
                "App/App.csproj",
                "8.5.0.0",
                null,
                null,
                [],
                0,
                [],
                [],
                [
                    new SymbolUse(
                        "T:Altinn.App.Core.Features.IDataProcessor",
                        "Altinn.App.Core",
                        UseKinds.Implement,
                        UseSources.App,
                        1,
                        "App/logic/DataProcessor.cs:10"
                    ),
                ],
                []
            );
            await using FileStream stream = File.Create(resultFile);
            await System.Text.Json.JsonSerializer.SerializeAsync(
                stream,
                usage,
                ApiUsageJsonContext.Default.AppUsage,
                cancellationToken
            );
            return null;
        }
    }
}

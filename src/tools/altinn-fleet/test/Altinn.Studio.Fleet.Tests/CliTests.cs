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
    public async Task InvalidArguments_ExitWithUsageError(params string[] args)
    {
        using var context = new FleetTestContext();

        (int exit, _, string error) = await Run(context, [.. args, "--store", context.Root]);

        Assert.Equal(2, exit);
        Assert.StartsWith("fleet: ", error, StringComparison.Ordinal);
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

    private static async Task<(int Exit, string Output, string Error)> Run(
        FleetTestContext context,
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
            context.Altinn
        );
        return (exit, output.ToString(), error.ToString());
    }
}

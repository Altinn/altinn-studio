using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class AppMetadataPropertyMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private CSharpSourceScanner Scanner() => new(Path.Combine(_app.Root, "App"));

    private (string Source, MigrationResult Result) Migrate(string source)
    {
        _app.Write("logic/Handler.cs", source);
        var result = new AppMetadataPropertyMigration(Scanner()).Migrate();
        return (_app.Read("logic/Handler.cs"), result);
    }

    [Fact]
    public void Rewrites_awaited_calls_through_a_field_a_parameter_and_this()
    {
        var (migrated, result) = Migrate(
            """
            using Altinn.App.Core.Internal.App;
            public class Handler
            {
                private readonly IAppMetadata _appMetadata;
                public Handler(IAppMetadata appMetadata) => _appMetadata = appMetadata;

                public async Task<string> Run(IAppMetadata other)
                {
                    var application = await _appMetadata.GetApplicationMetadata();
                    var policy = await this._appMetadata.GetApplicationXACMLPolicy();
                    var process = await other.GetApplicationBPMNProcess().ConfigureAwait(false);
                    var again = (await _appMetadata.GetApplicationMetadata()).Id;
                    return application.Id + policy + process + again;
                }
            }
            """
        );

        Assert.Contains("var application = _appMetadata.ApplicationMetadata;", migrated);
        Assert.Contains("var policy = this._appMetadata.XacmlPolicy;", migrated);
        Assert.Contains("var process = other.ProcessDefinition;", migrated);
        Assert.Contains("var again = (_appMetadata.ApplicationMetadata).Id;", migrated);
        Assert.DoesNotContain("GetApplication", migrated);
        Assert.False(result.RequiresManualFollowUp);
        Assert.Equal(4, result.Warnings.Count(w => w.Contains("Handler.cs:", StringComparison.Ordinal)));
    }

    [Fact]
    public void Rewrites_a_call_blocked_on_with_Result()
    {
        var (migrated, _) = Migrate(
            """
            using Altinn.App.Core.Internal.App;
            public class Handler(IAppMetadata appMetadata)
            {
                public string Id => appMetadata.GetApplicationMetadata().Result.Id;
            }
            """
        );

        Assert.Contains("public string Id => appMetadata.ApplicationMetadata.Id;", migrated);
    }

    [Fact]
    public void Leaves_a_call_on_an_unrelated_type_alone()
    {
        var (migrated, result) = Migrate(
            """
            public class Handler
            {
                private readonly MyClient _client;
                public async Task Run()
                {
                    var application = await _client.GetApplicationMetadata();
                }
            }
            """
        );

        Assert.Contains("await _client.GetApplicationMetadata()", migrated);
        Assert.Empty(result.Messages);
    }

    [Fact]
    public void Advises_on_a_call_handed_on_as_a_task()
    {
        var (migrated, result) = Migrate(
            """
            using Altinn.App.Core.Internal.App;
            public class Handler(IAppMetadata appMetadata)
            {
                public Task<ApplicationMetadata> Load() => appMetadata.GetApplicationMetadata();
            }
            """
        );

        Assert.Contains("appMetadata.GetApplicationMetadata()", migrated);
        Assert.False(result.RequiresManualFollowUp);
        Assert.Contains(result.Warnings, w => w.Contains("not awaited where they are made", StringComparison.Ordinal));
        Assert.Contains(
            result.Warnings,
            w => w.Contains("Handler.cs:4: appMetadata.GetApplicationMetadata()", StringComparison.Ordinal)
        );
    }

    [Fact]
    public void Is_idempotent()
    {
        var source = """
            using Altinn.App.Core.Internal.App;
            public class Handler(IAppMetadata appMetadata)
            {
                public async Task<string> Run() => (await appMetadata.GetApplicationMetadata()).Id;
            }
            """;
        var (once, _) = Migrate(source);
        var (twice, result) = Migrate(once);

        Assert.Equal(once, twice);
        Assert.Empty(result.Messages);
    }
}

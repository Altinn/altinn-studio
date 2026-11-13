using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;
using Altinn.Studio.Fleet.Http;
using Altinn.Studio.Fleet.Store;
using Altinn.Studio.Fleet.Sync;
using Microsoft.Data.Sqlite;

namespace Altinn.Studio.Fleet.Tests;

/// <summary>A store in a temporary folder, synced against <see cref="FakeAltinn"/>.</summary>
internal sealed class FleetTestContext : IDisposable
{
    public static readonly RetryPolicy NoDelay = new(3, TimeSpan.Zero, TimeSpan.Zero, TimeSpan.FromSeconds(10));

    private readonly HttpClient _http;
    private readonly FleetTelemetry _telemetry = new();

    public FleetTestContext(params string[] keyHosts)
        : this(null, keyHosts) { }

    public FleetTestContext(FleetOptions? options, params string[] keyHosts)
    {
        Root = Folder.CreateTemporary();
        Store = new FleetStore(Root);
        Credentials = new FakeCredentials(
            keyHosts.Length == 0 ? ["altinn.studio", "staging.altinn.studio", "dev.altinn.studio"] : keyHosts
        );
        _http = FleetHttp.CreateClient("test", NoDelay, Altinn);
        Sync = new FleetSync(Store, _http, Credentials, _telemetry, options);
    }

    public string Root { get; }

    public FleetStore Store { get; }

    public FakeAltinn Altinn { get; } = new();

    public FakeCredentials Credentials { get; }

    public FleetSync Sync { get; }

    public static RuntimeEnvironment Prod => RuntimeEnvironment.Production;

    public string ProdPath => Store.EnvironmentPath(Prod);

    public string AppPath(string org, string app) => Store.AppPath(Prod, AppIdentifier.Parse(org, app));

    public async Task<EnvironmentSyncResult> SyncProd(
        bool dryRun = false,
        bool retryFailed = false,
        IReadOnlySet<string>? orgs = null
    )
    {
        IReadOnlyList<EnvironmentSyncResult> results = await Sync.Sync(
            new SyncOptions
            {
                Environments = [Prod],
                DryRun = dryRun,
                RetryFailed = retryFailed,
                Orgs = orgs?.Select(ServiceOwnerCode.Parse).ToHashSet(),
                Parallelism = 4,
            },
            null,
            TestContext.Current.CancellationToken
        );
        return Assert.Single(results);
    }

    public List<string[]> Query(string sql)
    {
        using SqliteConnection connection = FleetStoreReader.OpenForQueries(Store, Prod);
        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = sql;
        using SqliteDataReader reader = command.ExecuteReader();
        var rows = new List<string[]>();
        while (reader.Read())
        {
            rows.Add([
                .. Enumerable
                    .Range(0, reader.FieldCount)
                    .Select(i =>
                        reader.IsDBNull(i)
                            ? "NULL"
                            : Convert.ToString(reader.GetValue(i), System.Globalization.CultureInfo.InvariantCulture)!
                    ),
            ]);
        }

        return rows;
    }

    public void Dispose()
    {
        _http.Dispose();
        _telemetry.Dispose();
        Directory.Delete(Root, recursive: true);
    }
}

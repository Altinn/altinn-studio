using System.Text;
using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppDist;
using Altinn.Studio.StudioctlServer.Studioctl;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Studioctl.Tests;

public sealed class AppDistSchemasServiceTests
{
    private sealed class FakeContent(Dictionary<string, string> files) : IAppDistContent
    {
        public string Version => "fake";

        public Task<Stream> OpenFile(string path, CancellationToken cancellationToken = default) =>
            Task.FromResult<Stream>(new MemoryStream(Encoding.UTF8.GetBytes(files[path])));

        public Task<string> GetFileText(string path, CancellationToken cancellationToken = default) =>
            Task.FromResult(files[path]);

        public Task<IReadOnlyDictionary<string, string>> GetFiles(
            string pathPrefix = "",
            CancellationToken cancellationToken = default
        )
        {
            var prefix = pathPrefix.Length == 0 || pathPrefix.EndsWith('/') ? pathPrefix : pathPrefix + "/";
            IReadOnlyDictionary<string, string> matched = files
                .Where(f => f.Key.StartsWith(prefix, StringComparison.Ordinal))
                .ToDictionary(f => f.Key[prefix.Length..], f => f.Value, StringComparer.Ordinal);
            return Task.FromResult(matched);
        }

        public Task<IReadOnlyList<string>> ListFiles(CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<string>>(files.Keys.Order(StringComparer.Ordinal).ToArray());

        public Task CopyToDirectory(string targetDirectory, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();
    }

    private sealed class FakeAppDist(Dictionary<string, string>? files) : IAppDistProvider
    {
        public int LayerRequests { get; private set; }

        public Task<IAppDistContent?> GetVersion(string version, CancellationToken cancellationToken = default) =>
            GetLayer(version, AppDistLayer.Schemas, cancellationToken);

        public Task<IAppDistContent?> GetLayer(
            string version,
            AppDistLayer layer,
            CancellationToken cancellationToken = default
        )
        {
            LayerRequests++;
            return Task.FromResult<IAppDistContent?>(files is null ? null : new FakeContent(files));
        }

        public Task<IReadOnlyList<string>> ListVersions(CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<string>> ListCachedVersions(
            AppDistLayer layer,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();
    }

    private static AppDistSchemasService Service(IAppDistProvider? provider) =>
        new(NullLogger<AppDistSchemasService>.Instance, () => provider);

    private static readonly Dictionary<string, string> SchemaFiles = new(StringComparer.Ordinal)
    {
        ["schemas/json/layout/layout.schema.v1.json"] = """{"type":"object"}""",
    };

    [Fact]
    public async Task ExactVersion_LoadsAndReportsRan()
    {
        var provider = new FakeAppDist(SchemaFiles);

        var result = await Service(provider).GetAsync("9.1.0", CancellationToken.None);

        Assert.True(result.Status.Ran);
        Assert.Equal("9.1.0", result.Status.Version);
        Assert.Null(result.Status.Reason);
    }

    [Fact]
    public async Task SecondRequest_ServesCachedSet()
    {
        var provider = new FakeAppDist(SchemaFiles);
        var service = Service(provider);

        var first = await service.GetAsync("9.1.0", CancellationToken.None);
        var second = await service.GetAsync("9.1.0", CancellationToken.None);

        Assert.Same(first.Schemas, second.Schemas);
        Assert.Equal(1, provider.LayerRequests);
    }

    [Fact]
    public async Task UnknownVersion_ReportsSkippedWithReason()
    {
        var result = await Service(new FakeAppDist(SchemaFiles)).GetAsync(null, CancellationToken.None);

        Assert.False(result.Status.Ran);
        Assert.Contains("exact Altinn.App version", result.Status.Reason);
        Assert.Same(Altinn.Studio.AppConfig.Validation.Schemas.SchemaSet.Empty, result.Schemas);
    }

    [Fact]
    public async Task OfflineCacheMiss_ReportsSkippedWithReason()
    {
        var result = await Service(new FakeAppDist(files: null)).GetAsync("9.1.0", CancellationToken.None);

        Assert.False(result.Status.Ran);
        Assert.Equal("9.1.0", result.Status.Version);
        Assert.Contains("unreachable and not cached", result.Status.Reason);
    }

    [Fact]
    public async Task DisabledProvider_ReportsSkippedWithReason()
    {
        var result = await Service(provider: null).GetAsync("9.1.0", CancellationToken.None);

        Assert.False(result.Status.Ran);
        Assert.Contains("not configured", result.Status.Reason);
    }

    [Fact]
    public async Task PartialLayer_ReportsWarnings()
    {
        var result = await Service(new FakeAppDist(SchemaFiles)).GetAsync("9.1.0", CancellationToken.None);

        Assert.True(result.Status.Ran);
        Assert.Contains(result.Status.Warnings, w => w.Contains("text-resources") && w.Contains("missing"));
    }

    [Fact]
    public async Task LoadedSet_ValidatesLayoutsByKind()
    {
        var provider = new FakeAppDist(
            new(StringComparer.Ordinal)
            {
                ["schemas/json/layout/layout.schema.v1.json"] = """
                {"properties":{"data":{"properties":{"layout":{"items":{"required":["size"]}}}}}}
                """,
                ["altinn-app-frontend.js"] = "console.log('not a schema')",
            }
        );
        var app = new InMemoryAppDirectory(
            new()
            {
                ["App/App.csproj"] = """
                <Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup><PackageReference Include="Altinn.App.Api" Version="9.0.0" /></ItemGroup></Project>
                """,
                ["App/config/applicationmetadata.json"] = """
                {"id":"ttd/x","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[]}
                """,
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = """{"data":{"layout":[{"id":"h","type":"Header"}]}}""",
            }
        );

        var result = await Service(provider).GetAsync("9.1.0", CancellationToken.None);

        Assert.True(result.Status.Ran);
        var report = AppConfigEngine.Open(app).ValidateSchemas(result.Schemas);
        var finding = Assert.Single(report.Findings, f => f.RuleId == "JSONSCHEMA-VALID");
        Assert.Contains("size", finding.Message);
    }

    [Fact]
    public async Task FailedLoadIsNotCached()
    {
        var provider = new FakeAppDist(files: null);
        var service = Service(provider);

        await service.GetAsync("9.1.0", CancellationToken.None);
        await service.GetAsync("9.1.0", CancellationToken.None);

        Assert.Equal(2, provider.LayerRequests);
    }
}

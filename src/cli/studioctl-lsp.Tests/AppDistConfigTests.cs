using System.Text;
using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfigLsp;
using Altinn.Studio.AppDist;
using Xunit;

namespace Altinn.Studio.AppConfigLsp.Tests;

public sealed class AppDistConfigTests
{
    private sealed class FakeContent(Dictionary<string, string> files) : IAppDistContent
    {
        public string Version => "fake";

        public Task<Stream> OpenFileAsync(string path, CancellationToken cancellationToken = default) =>
            Task.FromResult<Stream>(new MemoryStream(Encoding.UTF8.GetBytes(files[path])));

        public Task<string> GetFileTextAsync(string path, CancellationToken cancellationToken = default) =>
            Task.FromResult(files[path]);

        public Task<IReadOnlyDictionary<string, string>> GetFilesAsync(
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

        public Task<IReadOnlyList<string>> ListFilesAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<string>>(files.Keys.Order(StringComparer.Ordinal).ToArray());

        public Task CopyToDirectoryAsync(string targetDirectory, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();
    }

    private sealed class FakeAppDist(Dictionary<string, string>? files) : IAppDistProvider
    {
        public Task<IAppDistContent?> GetVersionAsync(string version, CancellationToken cancellationToken = default) =>
            GetLayerAsync(version, AppDistLayer.Schemas, cancellationToken);

        public Task<IAppDistContent?> GetLayerAsync(
            string version,
            AppDistLayer layer,
            CancellationToken cancellationToken = default
        ) => Task.FromResult<IAppDistContent?>(files is null ? null : new FakeContent(files));

        public Task<IReadOnlyList<string>?> ListVersionsAsync(CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<string>> ListCachedVersionsAsync(
            AppDistLayer layer,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();
    }

    [Fact]
    public async Task LoadSchemas_LoadedSetValidatesLayoutsByKind()
    {
        var appDist = new FakeAppDist(
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

        var schemas = await AppDistConfig.LoadSchemasAsync(appDist, "9.1.0");

        Assert.NotNull(schemas);
        var report = AppConfigEngine.Open(app).ValidateSchemas(schemas);
        var finding = Assert.Single(report.Findings, f => f.RuleId == "JSONSCHEMA-VALID");
        Assert.Contains("size", finding.Message);
    }

    [Fact]
    public async Task LoadSchemas_UnavailableLayerReturnsNull()
    {
        Assert.Null(await AppDistConfig.LoadSchemasAsync(new FakeAppDist(files: null), "9.1.0"));
    }
}

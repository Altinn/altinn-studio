namespace Altinn.Studio.AppDist.Tests;

public sealed class CompositionTests : IDisposable
{
    private const string ContentMediaType = "application/vnd.altinn.app-dist.content.v1.tar+gzip";
    private const string SchemasMediaType = "application/vnd.altinn.app-dist.schemas.v1.tar+gzip";

    private readonly string _root = Directory.CreateTempSubdirectory("appdist-composition-tests-").FullName;

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private static FakeRegistry RegistryWithVersion(string tag)
    {
        var handler = new FakeRegistry();
        var schemas = FakeRegistry.TarGz(
            ("schemas/json/layout/layout.schema.v1.json", """{"type":"object"}"""),
            ("schemas/json/layout/expression.schema.v1.json", "{}")
        );
        var content = FakeRegistry.TarGz(
            ("altinn-app-frontend.js", "js"),
            ("schemas/json/layout/layout.schema.v1.json", """{"type":"object"}"""),
            ("schemas/json/layout/expression.schema.v1.json", "{}")
        );
        handler.SetManifest(
            tag,
            (ContentMediaType, handler.AddBlob(content), content.Length),
            (SchemasMediaType, handler.AddBlob(schemas), schemas.Length)
        );
        return handler;
    }

    [Fact]
    public async Task PullLayerThroughHttpIntoFileSystemStoreAndReadBack()
    {
        var handler = RegistryWithVersion("4");
        IAppDistProvider provider = new AppDistProvider(
            new OciRegistrySource(new HttpClient(handler), $"{FakeRegistry.Host}/{FakeRegistry.Repository}"),
            new FileSystemAppDistStore(_root)
        );

        var schemas = await provider.GetLayer("4", AppDistLayer.Schemas, TestContext.Current.CancellationToken);

        Assert.NotNull(schemas);
        Assert.Equal(
            """{"type":"object"}""",
            await schemas.GetFileText(JsonSchemaPaths.Layout, TestContext.Current.CancellationToken)
        );
        var byRelativePath = await schemas.GetFiles("schemas/json", TestContext.Current.CancellationToken);
        string[] expected = ["layout/expression.schema.v1.json", "layout/layout.schema.v1.json"];
        Assert.Equal(expected, byRelativePath.Keys.Order(StringComparer.Ordinal));
        Assert.Equal(1, handler.BlobRequests);
    }

    [Fact]
    public async Task CreateDefault_WithCallerHttpClient_DoesNotDisposeIt()
    {
        var handler = RegistryWithVersion("4");
        using var httpClient = new HttpClient(handler);
        using (
            var provider = AppDistProvider.CreateDefault(
                _root,
                httpClient,
                $"{FakeRegistry.Host}/{FakeRegistry.Repository}"
            )
        )
        {
            Assert.NotNull(await provider.GetVersion("4", TestContext.Current.CancellationToken));
        }

        // A disposed HttpClient throws ObjectDisposedException here.
        using var response = await httpClient.GetAsync(
            new Uri($"https://{FakeRegistry.Host}/v2/{FakeRegistry.Repository}/tags/list"),
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(response);
    }

    [Fact]
    public async Task CreateDefault_ComposesOciSourceAndFileStore()
    {
        var handler = RegistryWithVersion("4");
        using var provider = AppDistProvider.CreateDefault(
            _root,
            new HttpClient(handler),
            $"{FakeRegistry.Host}/{FakeRegistry.Repository}"
        );

        var dist = await provider.GetVersion("4", TestContext.Current.CancellationToken);

        Assert.NotNull(dist);
        Assert.Equal(
            "js",
            await dist.GetFileText(FrontendPaths.AltinnAppFrontendJavascript, TestContext.Current.CancellationToken)
        );
        Assert.Equal(
            """{"type":"object"}""",
            await dist.GetFileText(JsonSchemaPaths.Layout, TestContext.Current.CancellationToken)
        );
        Assert.Equal(1, handler.BlobRequests);

        var schemas = await provider.GetLayer("4", AppDistLayer.Schemas, TestContext.Current.CancellationToken);
        Assert.NotNull(schemas);
        Assert.Equal(
            """{"type":"object"}""",
            await schemas.GetFileText(JsonSchemaPaths.Layout, TestContext.Current.CancellationToken)
        );
        Assert.Equal(2, handler.BlobRequests);
    }
}

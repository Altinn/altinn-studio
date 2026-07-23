using Xunit;

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
        IAppDistProvider provider = new AppDist(
            new OciRegistrySource(new HttpClient(handler), $"{FakeRegistry.Host}/{FakeRegistry.Repository}"),
            new FileSystemAppDistStore(_root)
        );

        var schemas = await provider.GetLayerAsync("4", AppDistLayer.Schemas);

        Assert.NotNull(schemas);
        Assert.Equal("""{"type":"object"}""", await schemas.GetFileTextAsync(AppDist.JsonSchemas.Layout));
        var byRelativePath = await schemas.GetFilesAsync("schemas/json");
        string[] expected = ["layout/expression.schema.v1.json", "layout/layout.schema.v1.json"];
        Assert.Equal(expected, byRelativePath.Keys.Order(StringComparer.Ordinal));
        Assert.Equal(1, handler.BlobRequests);
    }

    [Fact]
    public async Task CreateDefault_ComposesOciSourceAndFileStore()
    {
        var handler = RegistryWithVersion("4");
        using var provider = AppDist.CreateDefault(
            _root,
            new HttpClient(handler),
            $"{FakeRegistry.Host}/{FakeRegistry.Repository}"
        );

        var dist = await provider.GetVersionAsync("4");

        Assert.NotNull(dist);
        Assert.Equal("js", await dist.GetFileTextAsync(AppDist.Frontend.AltinnAppFrontendJavascript));
        Assert.Equal("""{"type":"object"}""", await dist.GetFileTextAsync(AppDist.JsonSchemas.Layout));
        Assert.Equal(1, handler.BlobRequests);

        var schemas = await provider.GetLayerAsync("4", AppDistLayer.Schemas);
        Assert.NotNull(schemas);
        Assert.Equal("""{"type":"object"}""", await schemas.GetFileTextAsync(AppDist.JsonSchemas.Layout));
        Assert.Equal(2, handler.BlobRequests);
    }
}

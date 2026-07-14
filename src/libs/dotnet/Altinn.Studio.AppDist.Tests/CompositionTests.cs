using Xunit;

namespace Altinn.Studio.AppDist.Tests;

public sealed class CompositionTests : IDisposable
{
    private const string SchemasMediaType = "application/vnd.altinn.app.schemas.tar+gzip";
    private const string BundleMediaType = "application/vnd.altinn.app.bundle.tar+gzip";

    private readonly string _root = Directory.CreateTempSubdirectory("appdist-composition-tests-").FullName;

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private static FakeRegistry RegistryWithVersion(string tag)
    {
        var handler = new FakeRegistry();
        var schemas = FakeRegistry.TarGz(
            ("schemas/json/layout/layout.schema.v1.json", """{"type":"object"}"""),
            ("schemas/json/layout/expression.schema.v1.json", "{}")
        );
        var bundle = FakeRegistry.TarGz(("altinn-app-frontend.js", "js"));
        handler.SetManifest(
            tag,
            (SchemasMediaType, handler.AddBlob(schemas), schemas.Length),
            (BundleMediaType, handler.AddBlob(bundle), bundle.Length)
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
        Assert.Equal("js", await dist.GetFileTextAsync(AppDist.Bundles.AltinnAppFrontendJavascript));

        provider.Dispose();
        var schemas = await provider.GetLayerAsync("4", AppDistLayer.Schemas);
        Assert.NotNull(schemas);
        Assert.Equal("""{"type":"object"}""", await schemas.GetFileTextAsync(AppDist.JsonSchemas.Layout));
    }
}

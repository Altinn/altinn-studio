using System.Text;
using Xunit;

namespace Altinn.Studio.AppDist.Tests;

public sealed class OciRegistrySourceTests
{
    private const string SchemasMediaType = "application/vnd.altinn.app.schemas.tar+gzip";
    private const string BundleMediaType = "application/vnd.altinn.app.bundle.tar+gzip";

    private static OciRegistrySource Source(FakeRegistry handler) =>
        new(new HttpClient(handler), $"{FakeRegistry.Host}/{FakeRegistry.Repository}");

    [Fact]
    public async Task FetchLayer_DownloadsOnlyRequestedLayer()
    {
        var handler = new FakeRegistry();
        var schemas = FakeRegistry.TarGz(("schemas/json/layout/layout.schema.v1.json", """{"type":"object"}"""));
        var bundle = FakeRegistry.TarGz(("index.html", "<html/>"));
        var unknown = FakeRegistry.TarGz(("future.bin", "??"));
        handler.SetManifest(
            "4",
            (SchemasMediaType, handler.AddBlob(schemas), schemas.Length),
            (BundleMediaType, handler.AddBlob(bundle), bundle.Length),
            ("application/vnd.some.future.layer", handler.AddBlob(unknown), unknown.Length)
        );

        var files = await Source(handler).FetchLayerAsync("4", AppDistLayer.Schemas, CancellationToken.None);

        var layout = Assert.Single(files);
        Assert.Equal("schemas/json/layout/layout.schema.v1.json", layout.Path);
        Assert.Equal("""{"type":"object"}""", Encoding.UTF8.GetString(layout.Content));
        Assert.Equal(1, handler.BlobRequests);
    }

    [Fact]
    public async Task FetchLayer_MissingLayerInManifestThrows()
    {
        var handler = new FakeRegistry();
        var bundle = FakeRegistry.TarGz(("index.html", "<html/>"));
        handler.SetManifest("4", (BundleMediaType, handler.AddBlob(bundle), bundle.Length));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Source(handler).FetchLayerAsync("4", AppDistLayer.Schemas, CancellationToken.None)
        );
        Assert.Contains(SchemasMediaType, ex.Message);
    }

    [Fact]
    public async Task FetchLayer_DigestMismatchThrows()
    {
        var handler = new FakeRegistry();
        var blob = FakeRegistry.TarGz(("schemas/json/a.json", "{}"));
        var lyingDigest = "sha256:" + new string('0', 64);
        handler.AddBlobAs(lyingDigest, blob);
        handler.SetManifest("4", (SchemasMediaType, lyingDigest, blob.Length));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Source(handler).FetchLayerAsync("4", AppDistLayer.Schemas, CancellationToken.None)
        );
        Assert.Contains("digest mismatch", ex.Message);
    }

    [Fact]
    public async Task FetchLayer_PathTraversalEntryThrows()
    {
        var handler = new FakeRegistry();
        var blob = FakeRegistry.TarGz(("../escape.json", "{}"));
        handler.SetManifest("4", (SchemasMediaType, handler.AddBlob(blob), blob.Length));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Source(handler).FetchLayerAsync("4", AppDistLayer.Schemas, CancellationToken.None)
        );
        Assert.Contains("unsafe path", ex.Message);
    }

    [Fact]
    public async Task FetchLayer_InvalidTagThrows()
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            Source(new FakeRegistry()).FetchLayerAsync("../evil", AppDistLayer.Schemas, CancellationToken.None)
        );
    }

    [Fact]
    public async Task FetchLayer_UnreachableRegistryThrowsUnavailable()
    {
        var handler = new FakeRegistry { Offline = true };

        await Assert.ThrowsAsync<AppDistSourceUnavailableException>(() =>
            Source(handler).FetchLayerAsync("4", AppDistLayer.Schemas, CancellationToken.None)
        );
    }

    [Fact]
    public async Task ListVersions_ReturnsDistinctSortedTags()
    {
        var handler = new FakeRegistry();
        handler.AddTags("4.1.0", "3.0.0", "4.1.0");

        var versions = await Source(handler).ListVersionsAsync(CancellationToken.None);

        Assert.Equal(["3.0.0", "4.1.0"], versions);
    }

    [Fact]
    public async Task ListVersions_FollowsPagination()
    {
        var handler = new FakeRegistry { TagPageSize = 2 };
        handler.AddTags("1", "2", "3", "4", "5");

        var versions = await Source(handler).ListVersionsAsync(CancellationToken.None);

        Assert.Equal(["1", "2", "3", "4", "5"], versions);
        Assert.Equal(3, handler.TagListRequests);
    }

    [Fact]
    public async Task ListVersions_UnreachableRegistryThrowsUnavailable()
    {
        var handler = new FakeRegistry { Offline = true };

        await Assert.ThrowsAsync<AppDistSourceUnavailableException>(() =>
            Source(handler).ListVersionsAsync(CancellationToken.None)
        );
    }

    [Fact]
    public void RepositoryWithoutHost_Throws()
    {
        Assert.Throws<ArgumentException>(() => new OciRegistrySource(new HttpClient(), "no-slash"));
    }
}

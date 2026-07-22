using System.Text;
using Xunit;

namespace Altinn.Studio.AppDist.Tests;

public sealed class OciRegistrySourceTests
{
    private const string ContentMediaType = "application/vnd.altinn.app-dist.content.v1.tar+gzip";
    private const string SchemasMediaType = "application/vnd.altinn.app-dist.schemas.v1.tar+gzip";

    private static OciRegistrySource Source(FakeRegistry handler) =>
        new(new HttpClient(handler), $"{FakeRegistry.Host}/{FakeRegistry.Repository}");

    [Fact]
    public async Task FetchLayer_DownloadsOnlyRequestedLayer()
    {
        var handler = new FakeRegistry();
        var schemas = FakeRegistry.TarGz(("schemas/json/layout/layout.schema.v1.json", """{"type":"object"}"""));
        var content = FakeRegistry.TarGz(("index.html", "<html/>"));
        var unknown = FakeRegistry.TarGz(("future.bin", "??"));
        handler.SetManifest(
            "4",
            (SchemasMediaType, handler.AddBlob(schemas), schemas.Length),
            (ContentMediaType, handler.AddBlob(content), content.Length),
            ("application/vnd.some.future.layer", handler.AddBlob(unknown), unknown.Length)
        );

        var files = await Source(handler).FetchLayerAsync("4", AppDistLayer.Schemas, CancellationToken.None);

        Assert.NotNull(files);
        var layout = Assert.Single(files);
        Assert.Equal("schemas/json/layout/layout.schema.v1.json", layout.Path);
        Assert.Equal("""{"type":"object"}""", Encoding.UTF8.GetString(layout.Content));
        Assert.Equal(1, handler.BlobRequests);
    }

    [Fact]
    public async Task FetchLayer_MissingLayerInManifestThrows()
    {
        var handler = new FakeRegistry();
        var content = FakeRegistry.TarGz(("index.html", "<html/>"));
        handler.SetManifest("4", (ContentMediaType, handler.AddBlob(content), content.Length));

        var ex = await Assert.ThrowsAsync<AppDistArtifactException>(() =>
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

        var ex = await Assert.ThrowsAsync<AppDistArtifactException>(() =>
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

        var ex = await Assert.ThrowsAsync<AppDistArtifactException>(() =>
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
    public async Task FetchLayer_MissingVersionReturnsNullAndIsNotCached()
    {
        var handler = new FakeRegistry();
        var source = Source(handler);

        Assert.Null(await source.FetchLayerAsync("4", AppDistLayer.Schemas, CancellationToken.None));
        Assert.Null(await source.FetchLayerAsync("4", AppDistLayer.Schemas, CancellationToken.None));

        Assert.Equal(2, handler.ManifestRequests);
    }

    [Fact]
    public async Task FetchLayer_ForbiddenRegistryThrowsAccessDenied()
    {
        var handler = new FakeRegistry { ManifestErrorStatus = System.Net.HttpStatusCode.Forbidden };

        var ex = await Assert.ThrowsAsync<AppDistSourceAccessDeniedException>(() =>
            Source(handler).FetchLayerAsync("4", AppDistLayer.Schemas, CancellationToken.None)
        );

        Assert.Equal(System.Net.HttpStatusCode.Forbidden, ex.StatusCode);
    }

    [Fact]
    public async Task FetchLayer_ServerFailureThrowsUnavailable()
    {
        var handler = new FakeRegistry { ManifestErrorStatus = System.Net.HttpStatusCode.ServiceUnavailable };

        var ex = await Assert.ThrowsAsync<AppDistSourceUnavailableException>(() =>
            Source(handler).FetchLayerAsync("4", AppDistLayer.Schemas, CancellationToken.None)
        );

        Assert.Equal(System.Net.HttpStatusCode.ServiceUnavailable, ex.StatusCode);
    }

    [Fact]
    public async Task FetchLayer_MissingRepositoryThrowsSourceError()
    {
        var handler = new FakeRegistry
        {
            ManifestErrorStatus = System.Net.HttpStatusCode.NotFound,
            ManifestErrorCode = "NAME_UNKNOWN",
        };

        var ex = await Assert.ThrowsAsync<AppDistSourceException>(() =>
            Source(handler).FetchLayerAsync("4", AppDistLayer.Schemas, CancellationToken.None)
        );

        Assert.Equal(System.Net.HttpStatusCode.NotFound, ex.StatusCode);
    }

    [Fact]
    public async Task FetchLayer_MissingReferencedBlobThrowsArtifactError()
    {
        var handler = new FakeRegistry();
        var missingDigest = "sha256:" + new string('0', 64);
        handler.SetManifest("4", (SchemasMediaType, missingDigest, 10));

        var ex = await Assert.ThrowsAsync<AppDistArtifactException>(() =>
            Source(handler).FetchLayerAsync("4", AppDistLayer.Schemas, CancellationToken.None)
        );

        Assert.Contains("missing blob", ex.Message);
    }

    [Fact]
    public async Task FetchLayer_InvalidManifestJsonThrowsArtifactError()
    {
        var handler = new FakeRegistry();
        handler.SetRawManifest("4", "not-json");

        var ex = await Assert.ThrowsAsync<AppDistArtifactException>(() =>
            Source(handler).FetchLayerAsync("4", AppDistLayer.Schemas, CancellationToken.None)
        );

        Assert.Contains("manifest", ex.Message);
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
    public async Task ListVersions_MissingRepositoryThrowsSourceError()
    {
        var handler = new FakeRegistry { TagListErrorStatus = System.Net.HttpStatusCode.NotFound };

        var ex = await Assert.ThrowsAsync<AppDistSourceException>(() =>
            Source(handler).ListVersionsAsync(CancellationToken.None)
        );

        Assert.Equal(System.Net.HttpStatusCode.NotFound, ex.StatusCode);
    }

    [Fact]
    public void RepositoryWithoutHost_Throws()
    {
        Assert.Throws<ArgumentException>(() => new OciRegistrySource(new HttpClient(), "no-slash"));
    }
}

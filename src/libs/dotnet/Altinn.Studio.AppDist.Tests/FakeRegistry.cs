using System.Formats.Tar;
using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;

namespace Altinn.Studio.AppDist.Tests;

internal sealed class FakeRegistry : HttpMessageHandler
{
    public const string Host = "registry.test";
    public const string Repository = "org/app-dist";

    private readonly Dictionary<string, string> _manifestsByTag = new(StringComparer.Ordinal);
    private readonly Dictionary<string, byte[]> _blobsByDigest = new(StringComparer.Ordinal);

    public int ManifestRequests { get; private set; }
    public int BlobRequests { get; private set; }
    public bool Offline { get; set; }

    public string AddBlob(byte[] bytes)
    {
        var digest = "sha256:" + Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
        _blobsByDigest[digest] = bytes;
        return digest;
    }

    public void AddBlobAs(string digest, byte[] bytes) => _blobsByDigest[digest] = bytes;

    public void SetManifest(string tag, params (string MediaType, string Digest, long Size)[] layers)
    {
        var layerJson = string.Join(
            ",",
            layers.Select(l => $$"""{"mediaType":"{{l.MediaType}}","digest":"{{l.Digest}}","size":{{l.Size}}}""")
        );
        _manifestsByTag[tag] =
            $$"""{"schemaVersion":2,"mediaType":"application/vnd.oci.image.manifest.v1+json","layers":[{{layerJson}}]}""";
    }

    public static byte[] TarGz(params (string Path, string Content)[] files)
    {
        using var buffer = new MemoryStream();
        using (var gzip = new GZipStream(buffer, CompressionMode.Compress, leaveOpen: true))
        using (var writer = new TarWriter(gzip))
        {
            foreach (var (path, content) in files)
            {
                var entry = new PaxTarEntry(TarEntryType.RegularFile, path)
                {
                    DataStream = new MemoryStream(Encoding.UTF8.GetBytes(content)),
                };
                writer.WriteEntry(entry);
            }
        }
        return buffer.ToArray();
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        if (Offline)
            throw new HttpRequestException("offline");

        var url = request.RequestUri?.ToString() ?? throw new InvalidOperationException("request has no URI");

        if (url.StartsWith($"https://{Host}/token", StringComparison.Ordinal))
            return Task.FromResult(Json("""{"token":"test-token"}"""));

        if (request.Headers.Authorization is not { Scheme: "Bearer", Parameter: "test-token" })
        {
            var challenge = new HttpResponseMessage(HttpStatusCode.Unauthorized);
            challenge.Headers.WwwAuthenticate.Add(
                new AuthenticationHeaderValue(
                    "Bearer",
                    $"realm=\"https://{Host}/token\",service=\"{Host}\",scope=\"repository:{Repository}:pull\""
                )
            );
            return Task.FromResult(challenge);
        }

        var manifestPrefix = $"https://{Host}/v2/{Repository}/manifests/";
        if (url.StartsWith(manifestPrefix, StringComparison.Ordinal))
        {
            ManifestRequests++;
            var tag = url[manifestPrefix.Length..];
            return Task.FromResult(
                _manifestsByTag.TryGetValue(tag, out var manifest)
                    ? Json(manifest)
                    : new HttpResponseMessage(HttpStatusCode.NotFound)
            );
        }

        var blobPrefix = $"https://{Host}/v2/{Repository}/blobs/";
        if (url.StartsWith(blobPrefix, StringComparison.Ordinal))
        {
            BlobRequests++;
            var digest = url[blobPrefix.Length..];
            return Task.FromResult(
                _blobsByDigest.TryGetValue(digest, out var bytes)
                    ? new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(bytes) }
                    : new HttpResponseMessage(HttpStatusCode.NotFound)
            );
        }

        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
    }

    private static HttpResponseMessage Json(string body) =>
        new(HttpStatusCode.OK) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
}

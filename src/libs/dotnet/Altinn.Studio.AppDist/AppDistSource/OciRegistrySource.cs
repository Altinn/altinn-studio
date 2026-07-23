using System.Formats.Tar;
using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace Altinn.Studio.AppDist;

public sealed partial class OciRegistrySource : IAppDistSource
{
    public const string DefaultRepository = "ghcr.io/altinn/altinn-studio/app-dist";

    private const string OciManifestMediaType = "application/vnd.oci.image.manifest.v1+json";

    private readonly HttpClient _http;
    private readonly string _host;
    private readonly string _repository;
    private string? _token;

    public OciRegistrySource(HttpClient httpClient, string repository = DefaultRepository)
    {
        ArgumentNullException.ThrowIfNull(httpClient);
        ArgumentNullException.ThrowIfNull(repository);
        var slash = repository.IndexOf('/');
        if (slash <= 0 || slash == repository.Length - 1)
            throw new ArgumentException(
                $"expected <registry-host>/<repository>, got \"{repository}\"",
                nameof(repository)
            );
        _http = httpClient;
        _host = repository[..slash];
        _repository = repository[(slash + 1)..];
    }

    public async Task<IReadOnlyList<AppDistFileEntry>> FetchLayerAsync(
        string version,
        AppDistLayer layer,
        CancellationToken cancellationToken
    )
    {
        if (!TagPattern().IsMatch(version))
            throw new ArgumentException($"not a valid OCI tag: \"{version}\"");

        var files = new List<AppDistFileEntry>();
        foreach (var ociLayer in await GetLayersAsync(version, LayerMediaType(layer), cancellationToken))
        {
            using var blob = await DownloadBlobAsync(ociLayer.Digest, cancellationToken);
            VerifyDigest(blob, ociLayer.Digest);
            blob.Position = 0;
            files.AddRange(ExtractTarGz(blob));
        }
        return files;
    }

    public async Task<IReadOnlyList<string>> ListVersionsAsync(CancellationToken cancellationToken)
    {
        var tags = new List<string>();
        var url = $"https://{_host}/v2/{_repository}/tags/list";
        try
        {
            while (url is not null)
            {
                var pageUrl = url;
                using var response = await SendAsync(
                    () => new HttpRequestMessage(HttpMethod.Get, pageUrl),
                    cancellationToken
                );
                response.EnsureSuccessStatusCode();
                var page = await response.Content.ReadFromJsonAsync<TagsResponse>(cancellationToken);
                if (page?.Tags is not null)
                    tags.AddRange(page.Tags);
                url = NextPageUrl(response);
            }
        }
        catch (Exception ex) when (IsTransportFailure(ex, cancellationToken))
        {
            throw Unavailable(ex);
        }
        return tags.Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal).ToArray();
    }

    private static string LayerMediaType(AppDistLayer layer) =>
        layer switch
        {
            AppDistLayer.Content => "application/vnd.altinn.app-dist.content.v1.tar+gzip",
            AppDistLayer.Schemas => "application/vnd.altinn.app-dist.schemas.v1.tar+gzip",
            _ => throw new ArgumentOutOfRangeException(nameof(layer), layer, "unknown app-dist layer"),
        };

    private string? NextPageUrl(HttpResponseMessage response)
    {
        if (!response.Headers.TryGetValues("Link", out var headers))
            return null;
        foreach (var link in headers.SelectMany(h => h.Split(',')))
        {
            var parts = link.Split(';');
            var target = parts[0].Trim();
            if (parts.Length < 2 || !target.StartsWith('<') || !target.EndsWith('>'))
                continue;
            if (!parts.Skip(1).Any(p => p.Trim() is "rel=\"next\"" or "rel=next"))
                continue;
            return new Uri(new Uri($"https://{_host}"), target[1..^1]).ToString();
        }
        return null;
    }

    private async Task<List<OciLayer>> GetLayersAsync(string version, string mediaType, CancellationToken ct)
    {
        OciManifest? manifest;
        try
        {
            using var response = await SendAsync(
                () =>
                {
                    var request = new HttpRequestMessage(
                        HttpMethod.Get,
                        $"https://{_host}/v2/{_repository}/manifests/{version}"
                    );
                    request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue(OciManifestMediaType));
                    return request;
                },
                ct
            );
            response.EnsureSuccessStatusCode();
            manifest = await response.Content.ReadFromJsonAsync<OciManifest>(ct);
        }
        catch (Exception ex) when (IsTransportFailure(ex, ct))
        {
            throw Unavailable(ex);
        }

        if (manifest?.Layers is null)
            throw new InvalidOperationException($"{_repository}:{version}: manifest has no layers");

        var layers = manifest
            .Layers.Where(l => string.Equals(l.MediaType, mediaType, StringComparison.Ordinal))
            .ToList();
        if (layers.Count == 0)
            throw new InvalidOperationException($"{_repository}:{version}: manifest has no {mediaType} layer");
        if (layers.Find(l => !DigestPattern().IsMatch(l.Digest)) is { } invalid)
            throw new InvalidOperationException(
                $"{_repository}:{version}: unsupported digest \"{invalid.Digest}\" for {invalid.MediaType}"
            );
        return layers;
    }

    private async Task<MemoryStream> DownloadBlobAsync(string digest, CancellationToken ct)
    {
        var blob = new MemoryStream();
        try
        {
            using var response = await SendAsync(
                () => new HttpRequestMessage(HttpMethod.Get, $"https://{_host}/v2/{_repository}/blobs/{digest}"),
                ct
            );
            response.EnsureSuccessStatusCode();
            await response.Content.CopyToAsync(blob, ct);
            return blob;
        }
        catch (Exception ex) when (IsTransportFailure(ex, ct))
        {
            await blob.DisposeAsync();
            throw Unavailable(ex);
        }
    }

    private void VerifyDigest(MemoryStream blob, string digest)
    {
        var actual = Convert.ToHexString(SHA256.HashData(blob.GetBuffer().AsSpan(0, (int)blob.Length)));
        var expected = digest["sha256:".Length..];
        if (!string.Equals(actual, expected, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException(
                $"{_repository}: blob {digest} digest mismatch (got sha256:{actual.ToLowerInvariant()})"
            );
    }

    private static List<AppDistFileEntry> ExtractTarGz(Stream archive)
    {
        var files = new List<AppDistFileEntry>();
        using var gzip = new GZipStream(archive, CompressionMode.Decompress, leaveOpen: true);
        using var reader = new TarReader(gzip);
        while (reader.GetNextEntry() is { } entry)
        {
            var isFile =
                entry.EntryType
                is TarEntryType.RegularFile
                    or TarEntryType.V7RegularFile
                    or TarEntryType.ContiguousFile;
            if (!isFile)
                continue;
            var path = NormalizeEntryPath(entry.Name);
            using var content = new MemoryStream();
            entry.DataStream?.CopyTo(content);
            files.Add(new AppDistFileEntry(path, content.ToArray()));
        }
        return files;
    }

    private static string NormalizeEntryPath(string name)
    {
        var path = name.Replace('\\', '/');
        if (path.StartsWith("./", StringComparison.Ordinal))
            path = path[2..];
        var segments = path.Split('/');
        if (path.Length == 0 || path[0] == '/' || segments.Any(s => s is "" or "." or ".."))
            throw new InvalidOperationException($"archive entry has an unsafe path: \"{name}\"");
        return path;
    }

    private async Task<HttpResponseMessage> SendAsync(Func<HttpRequestMessage> request, CancellationToken ct)
    {
        var response = await SendWithTokenAsync(request(), ct);
        if (response.StatusCode != HttpStatusCode.Unauthorized)
            return response;

        var challenge = response.Headers.WwwAuthenticate.FirstOrDefault(h =>
            string.Equals(h.Scheme, "Bearer", StringComparison.OrdinalIgnoreCase)
        );
        response.Dispose();
        if (challenge?.Parameter is null)
            throw new HttpRequestException($"{_host}: unauthorized without a bearer challenge");
        _token = await FetchTokenAsync(challenge.Parameter, ct);
        return await SendWithTokenAsync(request(), ct);
    }

    private async Task<HttpResponseMessage> SendWithTokenAsync(HttpRequestMessage request, CancellationToken ct)
    {
        if (_token is not null)
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
        return await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
    }

    private async Task<string> FetchTokenAsync(string challengeParameter, CancellationToken ct)
    {
        var parameters = ParseChallenge(challengeParameter);
        if (!parameters.TryGetValue("realm", out var realm))
            throw new HttpRequestException($"{_host}: bearer challenge has no realm");
        var query = new List<string>();
        if (parameters.TryGetValue("service", out var service))
            query.Add($"service={Uri.EscapeDataString(service)}");
        if (parameters.TryGetValue("scope", out var scope))
            query.Add($"scope={Uri.EscapeDataString(scope)}");
        var url = query.Count > 0 ? $"{realm}?{string.Join('&', query)}" : realm;

        using var response = await _http.GetAsync(new Uri(url), ct);
        response.EnsureSuccessStatusCode();
        var token = await response.Content.ReadFromJsonAsync<TokenResponse>(ct);
        return token?.Token
            ?? token?.AccessToken
            ?? throw new HttpRequestException($"{_host}: token endpoint returned no token");
    }

    private static Dictionary<string, string> ParseChallenge(string parameter)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var part in parameter.Split(','))
        {
            var idx = part.IndexOf('=');
            if (idx <= 0)
                continue;
            var key = part[..idx].Trim();
            var value = part[(idx + 1)..].Trim().Trim('"');
            result[key] = value;
        }
        return result;
    }

    private AppDistSourceUnavailableException Unavailable(Exception ex) =>
        new($"{_host}/{_repository} is unreachable: {ex.Message}", ex);

    private static bool IsTransportFailure(Exception ex, CancellationToken ct) =>
        ex switch
        {
            HttpRequestException => true,
            IOException => true,
            TaskCanceledException => !ct.IsCancellationRequested,
            _ => false,
        };

    [GeneratedRegex("^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$")]
    private static partial Regex TagPattern();

    [GeneratedRegex("^sha256:[a-f0-9]{64}$")]
    private static partial Regex DigestPattern();

    internal sealed record TagsResponse(string? Name, IReadOnlyList<string>? Tags);

    internal sealed record TokenResponse(
        string? Token,
        [property: JsonPropertyName("access_token")] string? AccessToken
    );

    internal sealed record OciManifest(string? MediaType, string? ArtifactType, IReadOnlyList<OciLayer>? Layers);

    internal sealed record OciLayer(string MediaType, string Digest, long Size);
}

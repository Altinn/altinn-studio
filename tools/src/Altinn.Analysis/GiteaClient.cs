using System.Globalization;
using System.IO.Compression;
using System.Net;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Web;
using LibGit2Sharp;

namespace Altinn.Analysis;

public sealed record GiteaOrg(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("avatar_url")] string? AvatarUrl,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("full_name")] string? FullName,
    [property: JsonPropertyName("location")] string? Location,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("email")] string? Email,
    [property: JsonPropertyName("visibility")] string? Visibility
)
{
    public bool Equals(GiteaOrg? other) => Id == other?.Id;

    public override int GetHashCode() => Id.GetHashCode();
}

public sealed record GiteaRepo(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("clone_url")] string CloneUrl,
    [property: JsonPropertyName("ssh_url")] string? SshUrl,
    [property: JsonPropertyName("url")] string? Url,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("full_name")] string FullName,
    [property: JsonPropertyName("default_branch")] string? DefaultBranch,
    [property: JsonPropertyName("link")] string? Link,
    [property: JsonPropertyName("private")] bool? Private
)
{
    private string[]? _split;

    [JsonIgnore]
    public string Org
    {
        get
        {
            _split ??= FullName.Split('/');
            return _split[0];
        }
    }

    public bool Equals(GiteaOrg? other) => Id == other?.Id;

    public override int GetHashCode() => Id.GetHashCode();
}

internal sealed record GiteaArchiveStatus([property: JsonPropertyName("complete")] bool Complete);

[JsonSourceGenerationOptions]
[JsonSerializable(typeof(GiteaOrg))]
[JsonSerializable(typeof(GiteaRepo))]
[JsonSerializable(typeof(GiteaArchiveStatus))]
internal sealed partial class GiteaClientJsonContext : JsonSerializerContext { }

public sealed class GiteaClient
{
    private const int PageSize = 50;
    private const string PageSizeStr = "50";

    private readonly HttpClient _httpClient;
    private readonly FetchConfig _config;

    public GiteaClient(FetchConfig config)
    {
        _config = config;
        HttpClient httpClient =
            new(
                new SocketsHttpHandler
                {
                    PooledConnectionLifetime = TimeSpan.FromMinutes(15) // Recreate every 15 minutes
                }
            );
        httpClient.BaseAddress = new Uri(config.AltinnUrl);
        httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
        httpClient.DefaultRequestHeaders.Add("Authorization", $"token {config.Password}");
        _httpClient = httpClient;
    }

    public async IAsyncEnumerable<GiteaOrg> GetOrgs(
        [EnumeratorCancellation] CancellationToken cancellationToken = default
    )
    {
        var page = 1;
        while (true)
        {
            var pageParam = page.ToString(CultureInfo.InvariantCulture);
            var url = $"/repos/api/v1/orgs?page={pageParam}&limit={PageSizeStr}";

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            using var response = await _httpClient.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken
            );

            response.EnsureSuccessStatusCode();
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);

            var enumerable = JsonSerializer.DeserializeAsyncEnumerable(
                stream,
                GiteaClientJsonContext.Default.GiteaOrg,
                cancellationToken: cancellationToken
            );

            var counter = 0;
            await foreach (var org in enumerable)
            {
                if (org is null)
                    throw new JsonException("Got 'null' org in response");
                if (string.IsNullOrWhiteSpace(org.Name))
                    throw new JsonException($"Got invalid name for org with ID: {org.Id}");

                yield return org;
                counter++;

                if (counter == Constants.LimitOrgs)
                    break;
            }

            if (counter < PageSize)
            {
                break;
            }

            page++;
        }
    }

    public async IAsyncEnumerable<GiteaRepo> GetRepos(
        string org,
        [EnumeratorCancellation] CancellationToken cancellationToken = default
    )
    {
        var page = 1;
        while (true)
        {
            var pageParam = page.ToString(CultureInfo.InvariantCulture);
            var orgParam = HttpUtility.UrlEncode(org);
            var url = $"/repos/api/v1/orgs/{orgParam}/repos?page={pageParam}&limit={PageSizeStr}";

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            using var response = await _httpClient.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken
            );

            response.EnsureSuccessStatusCode();
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);

            var enumerable = JsonSerializer.DeserializeAsyncEnumerable(
                stream,
                GiteaClientJsonContext.Default.GiteaRepo,
                cancellationToken: cancellationToken
            );

            var counter = 0;
            await foreach (var repo in enumerable)
            {
                if (repo is null)
                    throw new JsonException("Got 'null' repo in response");

                yield return repo;
                counter++;

                if (counter == Constants.LimitRepos)
                    break;
            }

            if (counter < PageSize)
            {
                break;
            }

            page++;
        }
    }

    public Task CloneRepo(
        GiteaRepo repo,
        string path,
        string? branch = null,
        CancellationToken cancellationToken = default
    )
    {
        return Task.Run(
            () =>
            {
                var options = new CloneOptions();
                options.FetchOptions.CredentialsProvider = (_url, _user, _cred) =>
                    new UsernamePasswordCredentials { Username = _config.Username, Password = _config.Password };
                if (!string.IsNullOrWhiteSpace(branch))
                    options.BranchName = branch;

                cancellationToken.ThrowIfCancellationRequested();
                Repository.Clone(repo.CloneUrl, path, options);
            },
            cancellationToken
        );
    }

    public async Task DownloadRepoArchive(
        GiteaOrg org,
        GiteaRepo repo,
        DirectoryInfo path,
        string branch,
        CancellationToken cancellationToken = default
    )
    {
        var url = $"/repos/api/v1/repos/{org.Name}/{repo.Name}/archive/{branch}.zip";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        using var response = await _httpClient.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken
        );

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            // AnsiConsole.MarkupLine($"Couldn't download branch '{branch}' for repo '{repo.FullName}'");
            // Some repos are just completely empty
            return;
        }

        response.EnsureSuccessStatusCode();
        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);

        using var zipStream = new ZipArchive(stream, ZipArchiveMode.Read);

        foreach (var entry in zipStream.Entries)
        {
            if (entry.Name == "")
                continue;

            await using var entryStream = entry.Open();

            // Make sure we are consistent with directory separator chars
            var entryFullPath =
                Path.DirectorySeparatorChar == '\\' ? entry.FullName.Replace('/', '\\') : entry.FullName;

            // Archive entry FullName starts with repo name/dir, but we just want all the contents of the
            // repo inside the input path, so we strip out the "root" directory from the full name
            var firstDirSlash = entryFullPath.IndexOf(Path.DirectorySeparatorChar);
            var entryPath = Path.Combine(path.FullName, entryFullPath.Substring(firstDirSlash + 1));

            // Make sure the directory we want to write to exists
            var directory =
                Path.GetDirectoryName(entryPath) ?? throw new Exception("Couldn't get archive entry directory");
            if (!Directory.Exists(directory))
                Directory.CreateDirectory(directory);

            await using var entryFileStream = File.Open(
                entryPath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.Read
            );
            await entryStream.CopyToAsync(entryFileStream, cancellationToken);
        }
    }
}

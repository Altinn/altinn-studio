using System.Collections.Concurrent;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Fleet.Tests;

/// <summary>
/// Plays the service owner registry, each service owner's kuberneteswrapper and the Studio installations, in memory.
/// Tests change it between syncs and read which requests it got.
/// </summary>
internal sealed partial class FakeAltinn : HttpMessageHandler
{
    public const string Key = "test-key";

    private readonly Lock _gate = new();

    /// <summary>The environments, in the registry's terms, of each service owner.</summary>
    public Dictionary<string, string[]> Orgs { get; } = [];

    /// <summary>What each service owner's cluster runs, by environment and service owner: app to version.</summary>
    public Dictionary<(string Env, string Org), Dictionary<string, string>> Deployments { get; } = [];

    /// <summary>Service owners whose cluster answers with this status instead, or throws when it is 0.</summary>
    public Dictionary<(string Env, string Org), HttpStatusCode> BrokenClusters { get; } = [];

    /// <summary>Releases, by Studio host name: (org, app, version) to commit.</summary>
    public Dictionary<string, Dictionary<(string Org, string App, string Version), string>> Releases { get; } = [];

    /// <summary>Studio hosts that do not have the lookup endpoint yet.</summary>
    public HashSet<string> HostsWithoutLookup { get; } = [];

    /// <summary>Archives, by host name and commit.</summary>
    public Dictionary<(string Host, string Commit), byte[]> Archives { get; } = [];

    /// <summary>Archive requests that answer with this status instead.</summary>
    public Dictionary<(string Host, string Commit), HttpStatusCode> ArchiveStatus { get; } = [];

    public ConcurrentQueue<string> Requests { get; } = new();

    public int Count(string fragment) => Requests.Count(r => r.Contains(fragment, StringComparison.Ordinal));

    public void ClearRequests() => Requests.Clear();

    /// <summary>Adds an org with an environment and an app that runs there at a version, released at a commit.</summary>
    public string Deploy(
        string env,
        string org,
        string app,
        string version,
        string host = "altinn.studio",
        TarBuilder? archive = null
    )
    {
        lock (_gate)
        {
            string registryEnv = env == "prod" ? "production" : env;
            string[] envs = Orgs.GetValueOrDefault(org) ?? [];
            if (!envs.Contains(registryEnv))
            {
                Orgs[org] = [.. envs, registryEnv];
            }

            if (!Deployments.TryGetValue((env, org), out Dictionary<string, string>? apps))
            {
                apps = [];
                Deployments[(env, org)] = apps;
            }

            apps[app] = version;
            string commit = Commit($"{host}/{org}/{app}/{version}");
            if (!Releases.TryGetValue(host, out var releases))
            {
                releases = [];
                Releases[host] = releases;
            }

            releases[(org, app, version)] = commit;
            Archives[(host, commit)] = (archive ?? TarBuilder.App(app, version)).Build();
            return commit;
        }
    }

    public static string Commit(string seed) =>
        Convert.ToHexStringLower(System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(seed)))[..40];

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        string url = request.RequestUri!.ToString();
        Requests.Enqueue($"{request.Method} {url}");
        string host = request.RequestUri.Host;
        string path = request.RequestUri.AbsolutePath;
        string? body = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
        lock (_gate)
        {
            if (url == "https://altinncdn.no/orgs/altinn-orgs.json")
            {
                var orgs = new JsonObject();
                foreach ((string org, string[] envs) in Orgs)
                {
                    orgs[org] = new JsonObject
                    {
                        ["environments"] = new JsonArray([.. envs.Select(e => JsonValue.Create(e))]),
                    };
                }

                return Json(new JsonObject { ["orgs"] = orgs });
            }

            if (
                ClusterHost().Match(host) is { Success: true } cluster
                && path == "/kuberneteswrapper/api/v1/deployments"
            )
            {
                string org = cluster.Groups["org"].Value;
                string env = cluster.Groups["env"].Success ? cluster.Groups["env"].Value : "prod";
                if (BrokenClusters.TryGetValue((env, org), out HttpStatusCode status))
                {
                    return status == 0
                        ? throw new HttpRequestException("Name or service not known")
                        : new HttpResponseMessage(status);
                }

                if (!Deployments.TryGetValue((env, org), out Dictionary<string, string>? apps))
                {
                    throw new HttpRequestException("Name or service not known");
                }

                var list = new JsonArray(new JsonObject { ["version"] = "abc", ["release"] = "kuberneteswrapper" });
                foreach ((string app, string version) in apps)
                {
                    list.Add(new JsonObject { ["version"] = version, ["release"] = $"{org}-{app}" });
                }

                return Json(list);
            }

            if (
                !Releases.ContainsKey(host)
                && host is not ("altinn.studio" or "staging.altinn.studio" or "dev.altinn.studio")
            )
            {
                throw new HttpRequestException($"Unexpected host {host}");
            }

            if (
                request.Headers.TryGetValues("X-Api-Key", out IEnumerable<string>? keys) is false
                || keys.Single() != Key
            )
            {
                return new HttpResponseMessage(HttpStatusCode.Unauthorized);
            }

            Dictionary<(string, string, string), string> released = Releases.GetValueOrDefault(host) ?? [];
            if (path == "/designer/api/v1/releases/lookup" && request.Method == HttpMethod.Post)
            {
                if (HostsWithoutLookup.Contains(host))
                {
                    return new HttpResponseMessage(HttpStatusCode.NotFound);
                }

                var results = new JsonArray();
                foreach (JsonNode? item in JsonNode.Parse(body!)!["items"]!.AsArray())
                {
                    var key = ((string)item!["org"]!, (string)item["app"]!, (string)item["version"]!);
                    if (released.TryGetValue(key, out string? commit))
                    {
                        results.Add(
                            new JsonObject
                            {
                                ["org"] = key.Item1,
                                ["app"] = key.Item2,
                                ["version"] = key.Item3,
                                ["commit"] = commit,
                                ["created"] = "2026-11-01T10:00:00+00:00",
                                ["addedLater"] = "ignored",
                            }
                        );
                    }
                }

                // Fields the client does not know, which the lookup may add later, are ignored.
                return Json(new JsonObject { ["releases"] = results, ["addedLater"] = 1 });
            }

            if (LegacyReleasesPath().Match(path) is { Success: true } legacy)
            {
                string org = legacy.Groups["org"].Value;
                string app = legacy.Groups["app"].Value;
                var results = new JsonArray();
                foreach (((string o, string a, string version), string commit) in released)
                {
                    if (o == org && a == app)
                    {
                        results.Add(
                            new JsonObject
                            {
                                ["tagName"] = version,
                                ["targetCommitish"] = commit,
                                ["created"] = "2026-11-01T10:00:00+00:00",
                                ["build"] = new JsonObject { ["result"] = "succeeded" },
                            }
                        );
                    }
                }

                return results.Count == 0
                    ? new HttpResponseMessage(HttpStatusCode.Forbidden)
                    : Json(new JsonObject { ["results"] = results });
            }

            if (ArchivePath().Match(path) is { Success: true } archive)
            {
                string commit = archive.Groups["commit"].Value;
                if (ArchiveStatus.TryGetValue((host, commit), out HttpStatusCode status))
                {
                    return new HttpResponseMessage(status);
                }

                return Archives.TryGetValue((host, commit), out byte[]? bytes)
                    ? new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(bytes) }
                    : new HttpResponseMessage(HttpStatusCode.NotFound);
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        }
    }

    private static HttpResponseMessage Json(JsonNode node) =>
        new(HttpStatusCode.OK)
        {
            Content = new StringContent(
                node.ToJsonString(new JsonSerializerOptions()),
                Encoding.UTF8,
                "application/json"
            ),
        };

    [GeneratedRegex(@"^(?<org>[^.]+)\.apps\.(?:(?<env>[a-z0-9]+)\.)?altinn\.no$")]
    private static partial Regex ClusterHost();

    [GeneratedRegex(@"^/designer/api/(?<org>[^/]+)/(?<app>[^/]+)/releases$")]
    private static partial Regex LegacyReleasesPath();

    [GeneratedRegex(@"^/repos/api/v1/repos/[^/]+/[^/]+/archive/(?<commit>[0-9a-f]{40})\.tar\.gz$")]
    private static partial Regex ArchivePath();
}

/// <summary>Gives the test key for the hosts it lists.</summary>
internal sealed class FakeCredentials(params string[] hosts) : IStudioCredentials
{
    public List<string> Asked { get; } = [];

    public ValueTask<string?> GetApiKey(StudioHost host, CancellationToken cancellationToken)
    {
        lock (Asked)
        {
            Asked.Add(host.HostName.Value);
        }

        return ValueTask.FromResult(hosts.Contains(host.HostName.Value) ? FakeAltinn.Key : null);
    }
}

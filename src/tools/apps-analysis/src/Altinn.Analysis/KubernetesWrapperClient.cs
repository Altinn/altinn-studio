using System.Net.Http.Json;
using System.Net.Sockets;
using System.Text.Json.Serialization;

namespace Altinn.Analysis;

// {"version":"1.2.15","release":"krt-krt-1001a-1"

public sealed record Deployment(string Version, string Repo);

public sealed class KubernetesWrapperClient
{
    private readonly HttpClient _httpClient;

    public KubernetesWrapperClient()
    {
        HttpClient httpClient = new(
            new SocketsHttpHandler
            {
                PooledConnectionLifetime = TimeSpan.FromMinutes(15), // Recreate every 15 minutes
                ConnectTimeout = TimeSpan.FromSeconds(5),
            }
        );
        httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
        _httpClient = httpClient;
    }

    private static string BaseUrl(string org, string env) =>
        $"https://{org}.apps{(env == "prod" ? "" : "." + env)}.altinn.no";

    public async Task<IReadOnlyList<Deployment>> GetDeployments(string org, string env)
    {
        var url = $"{BaseUrl(org, env)}/kuberneteswrapper/api/v1/deployments";

        IReadOnlyList<DeploymentInfoDto>? response = null;
        try
        {
            response = await _httpClient.GetFromJsonAsync<IReadOnlyList<DeploymentInfoDto>>(url);
        }
        catch (HttpRequestException e)
            when (e.InnerException is SocketException { SocketErrorCode: var errorCode }
                && (errorCode is SocketError.HostNotFound or SocketError.TimedOut)
            )
        {
            // There is an org in CDN, but they have no DNS record, probably aren't any deployments...
            return [];
        }
        catch (TaskCanceledException)
        {
            // Could be connect timeout
            return [];
        }

        if (response is null)
            throw new Exception($"Could not get deployments for: {org}, {env}");

        var deployments = new List<Deployment>(response.Count);
        for (int i = 0; i < response.Count; i++)
        {
            var deployment = response[i];
            if (string.IsNullOrWhiteSpace(deployment.Release))
                continue;

            if (deployment.Release == "kuberneteswrapper")
                continue;

            var split = deployment.Release.Split('-', 2, StringSplitOptions.RemoveEmptyEntries);
            if (split.Length != 2)
                throw new Exception(
                    $"Invalid deployment release string format for: {org}, {env} - {deployment.Release}"
                );
            var appId = split[1];

            deployments.Add(new Deployment(deployment.Version, appId));
        }

        return deployments;
    }

    internal sealed record DeploymentInfoDto(
        [property: JsonPropertyName("version")] string Version,
        [property: JsonPropertyName("release")] string Release
    );
}

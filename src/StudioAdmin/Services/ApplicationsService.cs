using System.Text.Json.Serialization;
using Altinn.Studio.Admin.Helpers;
using Altinn.Studio.Admin.Models;
using Altinn.Studio.Admin.Services.Interfaces;

namespace Altinn.Studio.Admin.Services;

/// <summary>
/// Implementation of the applications service using kuberneteswrapper.
/// </summary>
public class ApplicationsService : IApplicationsService
{
    private readonly HttpClient _httpClient;
    private readonly ICdnConfigService _cdnConfigService;

    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationsService"/> class.
    /// </summary>
    /// <param name="httpClient">The HTTP client to be used for API requests.</param>
    /// <param name="cdnConfigService">The CDN configuration service.</param>
    public ApplicationsService(HttpClient httpClient, ICdnConfigService cdnConfigService)
    {
        _httpClient = httpClient;
        _cdnConfigService = cdnConfigService;
    }

    /// <inheritdoc />
    public async Task<Dictionary<string, List<RunningApplication>>> GetRunningApplications(
        string org,
        CancellationToken ct
    )
    {
        var (orgEnvironments, sortedEnvironments) = await TaskUtilities.WhenAll(
            _cdnConfigService.GetOrgEnvironments(org),
            _cdnConfigService.GetSortedEnvironmentNames()
        );

        var runningApplications = new Dictionary<string, List<RunningApplication>>();
        foreach (var env in sortedEnvironments.Where(env => orgEnvironments.Contains(env)))
        {
            runningApplications.Add(env, new List<RunningApplication>());
        }

        var appsLock = new object();
        var tasks = orgEnvironments.Select(async env =>
        {
            var appsBaseUrl = await _cdnConfigService.GetAppsBaseUrl(org, env);
            var response = await _httpClient.GetAsync(
                $"{appsBaseUrl}/kuberneteswrapper/api/v1/deployments",
                ct
            );
            response.EnsureSuccessStatusCode();

            var deployments = await response.Content.ReadFromJsonAsync<List<Deployment>>(ct);
            if (deployments == null)
            {
                return;
            }

            var orgPrefix = $"{org}-";
            foreach (var deployment in deployments)
            {
                if (!deployment.Release.StartsWith(orgPrefix))
                {
                    continue;
                }

                var app = deployment.Release.Substring(orgPrefix.Length);
                lock (appsLock)
                {
                    runningApplications[env]
                        .Add(
                            new RunningApplication()
                            {
                                Org = org,
                                Env = env,
                                App = app,
                                Version = deployment.Version,
                            }
                        );
                }
            }
        });

        await Task.WhenAll(tasks);

        return runningApplications;
    }

    private class Deployment
    {
        [JsonPropertyName("version")]
        public required string Version { get; set; }

        [JsonPropertyName("release")]
        public required string Release { get; set; }
    }
}

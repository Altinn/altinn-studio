using System.Text.Json.Serialization;
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
    public async Task<List<RunningApplication>> GetRunningApplications(string org)
    {
        var orgEnvironments = await _cdnConfigService.GetOrgEnvironments(org);

        var runningApplications = new Dictionary<string, RunningApplication>();
        var appsLock = new object();

        var tasks = orgEnvironments.Select(async env =>
        {
            var appsBaseUrl = await _cdnConfigService.GetAppsBaseUrl(org, env);
            var response = await _httpClient.GetAsync(
                $"{appsBaseUrl}/kuberneteswrapper/api/v1/deployments"
            );
            response.EnsureSuccessStatusCode();

            var deployments = await response.Content.ReadFromJsonAsync<List<Deployment>>();
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
                    var application =
                        runningApplications.GetValueOrDefault(deployment.Release)
                        ?? new RunningApplication() { App = app, Org = org };
                    application.Environments.Add(env);
                    application.Environments.Sort();
                    runningApplications[deployment.Release] = application;
                }
            }
        });

        await Task.WhenAll(tasks);

        return runningApplications.Values.OrderBy(a => a.App).ToList();
    }

    private class Deployment
    {
        [JsonPropertyName("version")]
        public required string Version { get; set; }

        [JsonPropertyName("release")]
        public required string Release { get; set; }
    }
}

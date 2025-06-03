using System.Text.Json.Serialization;
using Admin.Models;
using Admin.Services.Interfaces;

namespace Admin.Services;

public class ApplicationsService : IApplicationsService
{
    private readonly HttpClient _httpClient;
    private readonly ICdnConfigService _cdnConfigService;

    public ApplicationsService(HttpClient httpClient, ICdnConfigService cdnConfigService)
    {
        _httpClient = httpClient;
        _cdnConfigService = cdnConfigService;
    }

    public async Task<List<RunningApplication>> GetRunningApplications(string org)
    {
        var orgEnvironments = await _cdnConfigService.GetOrgEnvironments(org);

        var runningApplications = new Dictionary<string, RunningApplication>();
        foreach (var env in orgEnvironments)
        {
            var appsBaseUrl = await _cdnConfigService.GetAppsBaseUrl(org, env);
            var response = await _httpClient.GetAsync(
                $"{appsBaseUrl}/kuberneteswrapper/api/v1/deployments"
            );
            response.EnsureSuccessStatusCode();

            var deployments = await response.Content.ReadFromJsonAsync<List<Deployment>>();
            if (deployments == null)
            {
                continue;
            }

            var orgPrefix = $"{org}-";
            foreach (var deployment in deployments)
            {
                if (!deployment.Release.StartsWith(orgPrefix))
                {
                    continue;
                }

                var app = deployment.Release.Substring(orgPrefix.Length);
                var application =
                    runningApplications.GetValueOrDefault(deployment.Release)
                    ?? new RunningApplication() { App = app, Org = org };
                application.Environments.Add(env);
                runningApplications[deployment.Release] = application;
            }
        }

        return runningApplications.Values.ToList();
    }

    private class Deployment
    {
        [JsonPropertyName("version")]
        public required string Version { get; set; }

        [JsonPropertyName("release")]
        public required string Release { get; set; }
    }
}

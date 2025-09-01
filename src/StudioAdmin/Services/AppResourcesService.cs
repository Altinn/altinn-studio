using System.Xml.Linq;
using Altinn.Studio.Admin.Models;
using Altinn.Studio.Admin.Services.Interfaces;

namespace Altinn.Studio.Admin.Services;

class AppResourcesService : IAppResourcesService
{
    private readonly HttpClient _httpClient;
    private readonly ICdnConfigService _cdnConfigService;

    private readonly XNamespace BPMN = "http://www.omg.org/spec/BPMN/20100524/MODEL";

    public AppResourcesService(HttpClient httpClient, ICdnConfigService cdnConfigService)
    {
        _httpClient = httpClient;
        _cdnConfigService = cdnConfigService;
    }

    public async Task<IEnumerable<ProcessTask>> GetProcessTasks(
        string org,
        string env,
        string app,
        CancellationToken ct
    )
    {
        var appsBaseUrl = await _cdnConfigService.GetAppsBaseUrl(org, env);

        var response = await _httpClient.GetAsync(
            $"{appsBaseUrl}/{org}/{app}/api/v1/meta/process",
            ct
        );

        response.EnsureSuccessStatusCode();
        string responseString = await response.Content.ReadAsStringAsync(ct);
        var processXml = XDocument.Parse(responseString);

        return processXml
            .Descendants(BPMN + "task")
            .Select(e => new ProcessTask()
            {
                Id =
                    (string?)e.Attribute("id")
                    ?? throw new InvalidOperationException(
                        $"Missing process task id in app {org}/{env}/{app}."
                    ),
                Name = (string?)e.Attribute("name"),
            });
    }
}

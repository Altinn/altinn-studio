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

        var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{appsBaseUrl}/{org}/{app}/api/v1/meta/process"
        );
        var response = await _httpClient.SendAsync(request);

        response.EnsureSuccessStatusCode();
        string responseString = await response.Content.ReadAsStringAsync();
        XDocument processXml = XDocument.Parse(responseString);

        ct.ThrowIfCancellationRequested();

        return processXml
            .Descendants(BPMN + "task")
            .Select(e => new ProcessTask()
            {
                Id = (string?)e.Attribute("id") ?? throw new NullReferenceException($"A process task id in the app {org}/{env}/{app} was null."),
                Name = (string?)e.Attribute("name"),
            });
    }
}

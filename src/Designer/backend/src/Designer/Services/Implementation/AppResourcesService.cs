using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Xml.Linq;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Implementation;

class AppResourcesService : IAppResourcesService
{
    private readonly HttpClient _httpClient;
    private readonly IEnvironmentsService _environmentsService;

    private readonly XNamespace _BPMN = "http://www.omg.org/spec/BPMN/20100524/MODEL";

    public AppResourcesService(HttpClient httpClient, IEnvironmentsService environmentsService)
    {
        _httpClient = httpClient;
        _environmentsService = environmentsService;
    }

    public async Task<IEnumerable<ProcessTask>> GetProcessTasks(
        string org,
        string env,
        string app,
        CancellationToken ct
    )
    {
        var appClusterUri = await _environmentsService.GetAppClusterUri(org, env);
        var response = await _httpClient.GetAsync(
            $"{appClusterUri}/{org}/{app}/api/v1/meta/process",
            ct
        );

        response.EnsureSuccessStatusCode();
        string responseString = await response.Content.ReadAsStringAsync(ct);
        var processXml = XDocument.Parse(responseString);

        return processXml
            .Descendants(_BPMN + "task")
            .Select(e => new ProcessTask()
            {
                Id =
                    (string)e.Attribute("id")
                    ?? throw new InvalidOperationException(
                        $"Missing process task id in app {org}/{env}/{app}."
                    ),
                Name = (string)e.Attribute("name"),
            });
    }
}

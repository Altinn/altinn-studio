#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Xml.Linq;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Implementation;

class AppResourcesService : IAppResourcesService
{
    private readonly HttpClient _httpClient;
    private readonly IEnvironmentsService _environmentsService;

    private readonly XNamespace _bpmnNs = "http://www.omg.org/spec/BPMN/20100524/MODEL";
    private readonly XNamespace _altinnNs = "http://altinn.no/process";
    private readonly List<string> _dataTypeProcessTags = new()
    {
        "signatureDataType",
        "signeeStatesDataTypeId",
        "signingPdfDataType",
        "paymentDataType",
        "paymentReceiptPdfDataType",
    };

    public AppResourcesService(HttpClient httpClient, IEnvironmentsService environmentsService)
    {
        _httpClient = httpClient;
        _environmentsService = environmentsService;
    }

    public async Task<ApplicationMetadata> GetApplicationMetadata(
        string org,
        string env,
        string app,
        CancellationToken ct
    )
    {
        var appClusterUri = await _environmentsService.GetAppClusterUri(org, env);
        using var response = await _httpClient.GetAsync(
            $"{appClusterUri}/{org}/{app}/api/v1/applicationmetadata",
            ct
        );

        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<ApplicationMetadata>(ct);
    }

    public async Task<IEnumerable<ProcessTask>> GetProcessTasks(
        string org,
        string env,
        string app,
        CancellationToken ct
    )
    {
        var appClusterUri = await _environmentsService.GetAppClusterUri(org, env);
        using var response = await _httpClient.GetAsync(
            $"{appClusterUri}/{org}/{app}/api/v1/meta/process",
            ct
        );

        response.EnsureSuccessStatusCode();
        string responseString = await response.Content.ReadAsStringAsync(ct);
        var processXml = XDocument.Parse(responseString);

        return processXml
            .Descendants(_bpmnNs + "task")
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

    public async Task<IEnumerable<ProcessDataType>> GetProcessDataTypeMetadata(
        string org,
        string env,
        string app,
        CancellationToken ct
    )
    {
        var appClusterUri = await _environmentsService.GetAppClusterUri(org, env);
        using var response = await _httpClient.GetAsync(
            $"{appClusterUri}/{org}/{app}/api/v1/meta/process",
            ct
        );

        response.EnsureSuccessStatusCode();
        string responseString = await response.Content.ReadAsStringAsync(ct);
        var processXml = XDocument.Parse(responseString);

        var processDataTypes = new List<ProcessDataType>();

        foreach (var taskElement in processXml.Descendants(_bpmnNs + "task"))
        {
            foreach (var tag in _dataTypeProcessTags)
            {
                foreach (var element in taskElement.Descendants(_altinnNs + tag))
                {
                    processDataTypes.Add(
                        new()
                        {
                            DataTypeId = element.Value,
                            TaskId =
                                (string)taskElement.Attribute("id")
                                ?? throw new InvalidOperationException(
                                    $"Missing process task id in app {org}/{env}/{app}."
                                ),
                            Tag = tag,
                        }
                    );
                }
            }
        }

        return processDataTypes;
    }
}

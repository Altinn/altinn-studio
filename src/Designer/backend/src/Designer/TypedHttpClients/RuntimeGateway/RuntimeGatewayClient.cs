using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;
using Microsoft.AspNetCore.Http.Extensions;

namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

public class RuntimeGatewayClient : IRuntimeGatewayClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly GeneralSettings _generalSettings;
    private readonly IEnvironmentsService _environmentsService;

    public RuntimeGatewayClient(
        IHttpClientFactory httpClientFactory,
        GeneralSettings generalSettings,
        IEnvironmentsService environmentsService
    )
    {
        _httpClientFactory = httpClientFactory;
        _generalSettings = generalSettings;
        _environmentsService = environmentsService;
    }

    public async Task<IEnumerable<AppDeployment>> GetAppDeployments(
        string org,
        AltinnEnvironment environment,
        CancellationToken cancellationToken
    )
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        var requestUrl = $"{baseUrl}/runtime/gateway/api/v1/deploy/origin/{_generalSettings.OriginEnvironment}/apps";

        var response = await client.GetFromJsonAsync<List<AppDeployment>>(requestUrl, cancellationToken);
        return response
            ?? throw new InvalidOperationException(
                "Received empty or null response body when deserializing List<AppDeployment>."
            );
    }

    public async Task<AppDeployment> GetAppDeployment(
        string org,
        string app,
        AltinnEnvironment environment,
        CancellationToken cancellationToken
    )
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        var requestUrl = $"{baseUrl}/runtime/gateway/api/v1/deploy/apps/{app}/{_generalSettings.OriginEnvironment}";

        var response = await client.GetFromJsonAsync<AppDeployment>(requestUrl, cancellationToken);
        return response
            ?? throw new InvalidOperationException(
                "Received empty or null response body when deserializing AppDeployment."
            );
    }

    public async Task<bool> IsAppDeployedWithGitOpsAsync(
        string org,
        string app,
        AltinnEnvironment environment,
        CancellationToken cancellationToken
    )
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        var requestUrl =
            $"{baseUrl}/runtime/gateway/api/v1/deploy/apps/{app}/{_generalSettings.OriginEnvironment}/deployed";

        var response = await client.GetFromJsonAsync<IsAppDeployedResponse>(requestUrl, cancellationToken);
        return response?.IsDeployed ?? false;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AlertRule>> GetAlertRulesAsync(
        string org,
        AltinnEnvironment environment,
        CancellationToken cancellationToken
    )
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        string requestUrl = $"{baseUrl}/runtime/gateway/api/v1/alerts";

        return await client.GetFromJsonAsync<IEnumerable<AlertRule>>(requestUrl, cancellationToken) ?? [];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<ErrorMetric>> GetErrorMetricsAsync(
        string org,
        AltinnEnvironment environment,
        int range,
        CancellationToken cancellationToken
    )
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        string requestUrl = $"{baseUrl}/runtime/gateway/api/v1/metrics/errors?range={range}";

        return await client.GetFromJsonAsync<IEnumerable<ErrorMetric>>(requestUrl, cancellationToken) ?? [];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppMetric>> GetAppMetricsAsync(
        string org,
        AltinnEnvironment environment,
        string app,
        int range,
        CancellationToken cancellationToken
    )
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        string requestUrl =
            $"{baseUrl}/runtime/gateway/api/v1/metrics/app?app={Uri.EscapeDataString(app)}&range={range}";

        return await client.GetFromJsonAsync<IEnumerable<AppMetric>>(requestUrl, cancellationToken) ?? [];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppErrorMetric>> GetAppErrorMetricsAsync(
        string org,
        AltinnEnvironment environment,
        string app,
        int range,
        CancellationToken cancellationToken
    )
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        string requestUrl =
            $"{baseUrl}/runtime/gateway/api/v1/metrics/app/errors?app={Uri.EscapeDataString(app)}&range={range}";

        return await client.GetFromJsonAsync<IEnumerable<AppErrorMetric>>(requestUrl, cancellationToken) ?? [];
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppHealthMetric>> GetAppHealthMetricsAsync(
        string org,
        AltinnEnvironment environment,
        string app,
        CancellationToken cancellationToken
    )
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        string requestUrl = $"{baseUrl}/runtime/gateway/api/v1/metrics/app/health?app={Uri.EscapeDataString(app)}";

        return await client.GetFromJsonAsync<IEnumerable<AppHealthMetric>>(requestUrl, cancellationToken) ?? [];
    }

    public async Task<AppActivityMetricsResponse> GetAppActivityMetricsAsync(
        string org,
        AltinnEnvironment environment,
        int windowDays,
        CancellationToken cancellationToken
    )
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(windowDays);

        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        string requestUrl = $"{baseUrl}/runtime/gateway/api/v1/metrics/app/activity?windowDays={windowDays}";

        var response = await client.GetFromJsonAsync<AppActivityMetricsResponse>(requestUrl, cancellationToken);
        return response
            ?? throw new InvalidOperationException(
                "Received empty or null response body when deserializing AppActivityMetricsResponse."
            );
    }

    public async Task TriggerReconcileAsync(
        string org,
        string app,
        AltinnEnvironment environment,
        bool isUndeploy,
        CancellationToken cancellationToken
    )
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        var requestUrl =
            $"{baseUrl}/runtime/gateway/api/v1/deploy/apps/{app}/{_generalSettings.OriginEnvironment}/reconcile";

        var request = new TriggerReconcileRequest(isUndeploy);
        var response = await HttpClientJsonExtensions.PostAsJsonAsync(client, requestUrl, request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    /// <inheritdoc />
    public Task<HttpResponseMessage> GetWorkflowCollectionsAsync(
        string org,
        string app,
        AltinnEnvironment environment,
        IReadOnlyList<string>? keys,
        string? failures,
        string? cursor,
        int? pageSize,
        CancellationToken cancellationToken
    )
    {
        var query = new QueryBuilder();
        AddAll(query, "key", keys);
        AddIfPresent(query, "failures", failures);
        AddIfPresent(query, "cursor", cursor);
        AddIfPresent(query, "pageSize", pageSize);

        return SendWorkflowRequestAsync(
            HttpMethod.Get,
            org,
            app,
            environment,
            "/collections",
            query,
            cancellationToken
        );
    }

    /// <inheritdoc />
    public Task<HttpResponseMessage> GetWorkflowCollectionAsync(
        string org,
        string app,
        AltinnEnvironment environment,
        string key,
        CancellationToken cancellationToken
    )
    {
        return SendWorkflowRequestAsync(
            HttpMethod.Get,
            org,
            app,
            environment,
            $"/collections/{Uri.EscapeDataString(key)}",
            query: null,
            cancellationToken
        );
    }

    /// <inheritdoc />
    public Task<HttpResponseMessage> GetWorkflowsAsync(
        string org,
        string app,
        AltinnEnvironment environment,
        string? collectionKey,
        IReadOnlyList<string>? statuses,
        IReadOnlyList<string>? labels,
        bool? isHead,
        string? cursor,
        int? pageSize,
        CancellationToken cancellationToken
    )
    {
        var query = new QueryBuilder();
        AddIfPresent(query, "collectionKey", collectionKey);
        AddAll(query, "status", statuses);
        AddAll(query, "label", labels);
        if (isHead is not null)
        {
            query.Add("isHead", isHead.Value ? "true" : "false");
        }
        AddIfPresent(query, "cursor", cursor);
        AddIfPresent(query, "pageSize", pageSize);

        return SendWorkflowRequestAsync(HttpMethod.Get, org, app, environment, "/workflows", query, cancellationToken);
    }

    /// <inheritdoc />
    public Task<HttpResponseMessage> GetWorkflowAsync(
        string org,
        string app,
        AltinnEnvironment environment,
        Guid workflowId,
        CancellationToken cancellationToken
    )
    {
        return SendWorkflowRequestAsync(
            HttpMethod.Get,
            org,
            app,
            environment,
            $"/workflows/{workflowId}",
            query: null,
            cancellationToken
        );
    }

    /// <inheritdoc />
    public Task<HttpResponseMessage> ResumeWorkflowAsync(
        string org,
        string app,
        AltinnEnvironment environment,
        Guid workflowId,
        bool cascade,
        CancellationToken cancellationToken
    )
    {
        var query = new QueryBuilder { { "cascade", cascade ? "true" : "false" } };

        return SendWorkflowRequestAsync(
            HttpMethod.Post,
            org,
            app,
            environment,
            $"/workflows/{workflowId}/resume",
            query,
            cancellationToken
        );
    }

    /// <inheritdoc />
    public Task<HttpResponseMessage> AbandonWorkflowAsync(
        string org,
        string app,
        AltinnEnvironment environment,
        Guid workflowId,
        CancellationToken cancellationToken
    )
    {
        return SendWorkflowRequestAsync(
            HttpMethod.Post,
            org,
            app,
            environment,
            $"/workflows/{workflowId}/abandon",
            query: null,
            cancellationToken
        );
    }

    private async Task<HttpResponseMessage> SendWorkflowRequestAsync(
        HttpMethod method,
        string org,
        string app,
        AltinnEnvironment environment,
        string pathSuffix,
        QueryBuilder? query,
        CancellationToken cancellationToken
    )
    {
        using var client = _httpClientFactory.CreateClient("runtime-gateway");
        var baseUrl = await _environmentsService.GetAppClusterUri(org, environment.Name);
        string requestUrl =
            $"{baseUrl}/runtime/gateway/api/v1/workflows/apps/{Uri.EscapeDataString(app)}"
            + $"{pathSuffix}{query?.ToQueryString().ToUriComponent()}";

        using var request = new HttpRequestMessage(method, requestUrl);

        // The response is buffered before the client is disposed, and returned unmodified —
        // status code included — so the gateway/engine wire contract passes through untouched.
        return await client.SendAsync(request, HttpCompletionOption.ResponseContentRead, cancellationToken);
    }

    private static void AddAll(QueryBuilder query, string name, IReadOnlyList<string>? values)
    {
        if (values is null)
        {
            return;
        }

        foreach (string value in values)
        {
            query.Add(name, value);
        }
    }

    private static void AddIfPresent(QueryBuilder query, string name, string? value)
    {
        if (value is not null)
        {
            query.Add(name, value);
        }
    }

    private static void AddIfPresent(QueryBuilder query, string name, int? value)
    {
        if (value is not null)
        {
            query.Add(name, value.Value.ToString(CultureInfo.InvariantCulture));
        }
    }

    private record TriggerReconcileRequest(bool IsUndeploy);
}

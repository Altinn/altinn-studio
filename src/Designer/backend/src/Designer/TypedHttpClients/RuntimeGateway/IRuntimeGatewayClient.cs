using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Models.Metrics;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

public interface IRuntimeGatewayClient
{
    Task<IEnumerable<AppDeployment>> GetAppDeployments(
        string org,
        AltinnEnvironment environment,
        CancellationToken cancellationToken
    );
    Task<AppDeployment> GetAppDeployment(
        string org,
        string app,
        AltinnEnvironment environment,
        CancellationToken cancellationToken
    );
    Task<bool> IsAppDeployedWithGitOpsAsync(
        string org,
        string app,
        AltinnEnvironment environment,
        CancellationToken cancellationToken
    );
    Task<IEnumerable<AlertRule>> GetAlertRulesAsync(
        string org,
        AltinnEnvironment environment,
        CancellationToken cancellationToken
    );
    Task<IEnumerable<ErrorMetric>> GetErrorMetricsAsync(
        string org,
        AltinnEnvironment environment,
        int range,
        CancellationToken cancellationToken
    );
    Task<IEnumerable<AppMetric>> GetAppMetricsAsync(
        string org,
        AltinnEnvironment environment,
        string app,
        int range,
        CancellationToken cancellationToken
    );
    Task<IEnumerable<AppErrorMetric>> GetAppErrorMetricsAsync(
        string org,
        AltinnEnvironment environment,
        string app,
        int range,
        CancellationToken cancellationToken
    );
    Task<IEnumerable<AppHealthMetric>> GetAppHealthMetricsAsync(
        string org,
        AltinnEnvironment environment,
        string app,
        CancellationToken cancellationToken
    );
    Task<AppActivityMetricsResponse> GetAppActivityMetricsAsync(
        string org,
        AltinnEnvironment environment,
        int windowDays,
        CancellationToken cancellationToken
    );
    Task TriggerReconcileAsync(
        string org,
        string app,
        AltinnEnvironment environment,
        bool isUndeploy,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Lists workflow collections for an app through the runtime gateway's workflow pass-through.
    /// Three mutually exclusive modes: list (<paramref name="cursor"/>, <paramref name="pageSize"/>),
    /// annotate (<paramref name="keys"/>, repeatable), and discover (<paramref name="failures"/>).
    /// The gateway/engine response is returned unmodified, whatever its status code.
    /// </summary>
    Task<HttpResponseMessage> GetWorkflowCollectionsAsync(
        string org,
        string app,
        AltinnEnvironment environment,
        IReadOnlyList<string>? keys,
        string? failures,
        string? cursor,
        int? pageSize,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Gets a single workflow collection by key through the runtime gateway's workflow pass-through.
    /// The gateway/engine response is returned unmodified, whatever its status code.
    /// </summary>
    Task<HttpResponseMessage> GetWorkflowCollectionAsync(
        string org,
        string app,
        AltinnEnvironment environment,
        string key,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Lists workflows for an app through the runtime gateway's workflow pass-through.
    /// The gateway/engine response is returned unmodified, whatever its status code.
    /// </summary>
    Task<HttpResponseMessage> GetWorkflowsAsync(
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
    );

    /// <summary>
    /// Gets a single workflow by id through the runtime gateway's workflow pass-through.
    /// The gateway/engine response is returned unmodified, whatever its status code.
    /// </summary>
    Task<HttpResponseMessage> GetWorkflowAsync(
        string org,
        string app,
        AltinnEnvironment environment,
        Guid workflowId,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Resumes a terminal workflow through the runtime gateway's workflow pass-through.
    /// The gateway/engine response is returned unmodified, whatever its status code.
    /// </summary>
    Task<HttpResponseMessage> ResumeWorkflowAsync(
        string org,
        string app,
        AltinnEnvironment environment,
        Guid workflowId,
        bool cascade,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Abandons an unsuccessful terminal workflow through the runtime gateway's workflow pass-through.
    /// The gateway/engine response is returned unmodified, whatever its status code.
    /// </summary>
    Task<HttpResponseMessage> AbandonWorkflowAsync(
        string org,
        string app,
        AltinnEnvironment environment,
        Guid workflowId,
        CancellationToken cancellationToken
    );
}

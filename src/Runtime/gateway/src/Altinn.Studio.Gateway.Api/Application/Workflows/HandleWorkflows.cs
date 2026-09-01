using System.Globalization;
using System.Security.Claims;
using Altinn.Studio.Gateway.Api.Clients.WorkflowEngine;
using Altinn.Studio.Gateway.Api.Settings;
using Altinn.Studio.Gateway.Contracts.Workflows;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Application;

/// <summary>
/// Whitelisted 1:1 pass-through of workflow engine endpoints for Studio's admin surface.
/// The gateway is a policy layer, not a translation layer: engine responses (status code,
/// content type, JSON body) are streamed through unmodified so the engine DTOs stay the
/// single wire vocabulary. The engine namespace is always computed as {serviceOwner}/{app} —
/// callers can never address another namespace.
/// </summary>
internal static class HandleWorkflows
{
    /// <summary>Logger category for the audit lines emitted on the two mutating verbs.</summary>
    internal const string AuditLoggerCategory = "Altinn.Studio.Gateway.Api.WorkflowAudit";

    private const string DiagnosticsLoggerCategory = "Altinn.Studio.Gateway.Api.Application.HandleWorkflows";

    // Per-route query whitelists. Unrecognized parameters are rejected (400) rather than
    // silently dropped: Designer is deployed centrally while gateways roll out per cluster,
    // so version skew must fail loudly instead of returning 200 with unfiltered data.
    private static readonly string[] _collectionListQueryKeys = ["key", "failures", "cursor", "pageSize"];
    private static readonly string[] _workflowListQueryKeys =
    [
        "collectionKey",
        "status",
        "label",
        "isHead",
        "cursor",
        "pageSize",
    ];
    private static readonly string[] _resumeQueryKeys = ["cascade"];
    private static readonly string[] _noQueryKeys = [];

    internal static Task<IResult> ListCollections(
        string app,
        [FromQuery(Name = "key")] string[]? keys,
        [FromQuery] string? failures,
        [FromQuery] string? cursor,
        [FromQuery] int? pageSize,
        HttpContext httpContext,
        IOptionsMonitor<GatewayContext> gatewayContext,
        WorkflowEngineClient engineClient,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken
    )
    {
        var query = new QueryBuilder();
        AddAll(query, "key", keys);
        AddIfPresent(query, "failures", failures);
        AddIfPresent(query, "cursor", cursor);
        AddIfPresent(query, "pageSize", pageSize);

        return ForwardToEngine(
            HttpMethod.Get,
            httpContext,
            app,
            "/collections",
            _collectionListQueryKeys,
            query,
            gatewayContext,
            engineClient,
            loggerFactory,
            audit: null,
            cancellationToken
        );
    }

    internal static Task<IResult> GetCollection(
        string app,
        string key,
        HttpContext httpContext,
        IOptionsMonitor<GatewayContext> gatewayContext,
        WorkflowEngineClient engineClient,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken
    )
    {
        return ForwardToEngine(
            HttpMethod.Get,
            httpContext,
            app,
            $"/collections/{Uri.EscapeDataString(key)}",
            _noQueryKeys,
            query: null,
            gatewayContext,
            engineClient,
            loggerFactory,
            audit: null,
            cancellationToken
        );
    }

    internal static Task<IResult> ListWorkflows(
        string app,
        [FromQuery] string? collectionKey,
        [FromQuery(Name = "status")] string[]? statuses,
        [FromQuery(Name = "label")] string[]? labels,
        [FromQuery] bool? isHead,
        [FromQuery] string? cursor,
        [FromQuery] int? pageSize,
        HttpContext httpContext,
        IOptionsMonitor<GatewayContext> gatewayContext,
        WorkflowEngineClient engineClient,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken
    )
    {
        var query = new QueryBuilder();
        AddIfPresent(query, "collectionKey", collectionKey);
        AddAll(query, "status", statuses);
        AddAll(query, "label", labels);
        AddIfPresent(query, "isHead", isHead);
        AddIfPresent(query, "cursor", cursor);
        AddIfPresent(query, "pageSize", pageSize);

        return ForwardToEngine(
            HttpMethod.Get,
            httpContext,
            app,
            "/workflows",
            _workflowListQueryKeys,
            query,
            gatewayContext,
            engineClient,
            loggerFactory,
            audit: null,
            cancellationToken
        );
    }

    internal static Task<IResult> GetWorkflow(
        string app,
        Guid workflowId,
        HttpContext httpContext,
        IOptionsMonitor<GatewayContext> gatewayContext,
        WorkflowEngineClient engineClient,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken
    )
    {
        return ForwardToEngine(
            HttpMethod.Get,
            httpContext,
            app,
            $"/workflows/{workflowId}",
            _noQueryKeys,
            query: null,
            gatewayContext,
            engineClient,
            loggerFactory,
            audit: null,
            cancellationToken
        );
    }

    internal static Task<IResult> ResumeWorkflow(
        string app,
        Guid workflowId,
        [FromQuery] bool? cascade,
        HttpContext httpContext,
        IOptionsMonitor<GatewayContext> gatewayContext,
        WorkflowEngineClient engineClient,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken
    )
    {
        var query = new QueryBuilder { { "cascade", cascade is true ? "true" : "false" } };

        return ForwardToEngine(
            HttpMethod.Post,
            httpContext,
            app,
            $"/workflows/{workflowId}/resume",
            _resumeQueryKeys,
            query,
            gatewayContext,
            engineClient,
            loggerFactory,
            audit: new AuditContext(httpContext.User, "resume", workflowId),
            cancellationToken
        );
    }

    internal static Task<IResult> AbandonWorkflow(
        string app,
        Guid workflowId,
        HttpContext httpContext,
        IOptionsMonitor<GatewayContext> gatewayContext,
        WorkflowEngineClient engineClient,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken
    )
    {
        return ForwardToEngine(
            HttpMethod.Post,
            httpContext,
            app,
            $"/workflows/{workflowId}/abandon",
            _noQueryKeys,
            query: null,
            gatewayContext,
            engineClient,
            loggerFactory,
            audit: new AuditContext(httpContext.User, "abandon", workflowId),
            cancellationToken
        );
    }

    /// <summary>Caller identity and verb for the audit line emitted on mutations.</summary>
    private sealed record AuditContext(ClaimsPrincipal User, string Verb, Guid WorkflowId);

    private static async Task<IResult> ForwardToEngine(
        HttpMethod method,
        HttpContext httpContext,
        string app,
        string upstreamSuffix,
        string[] allowedQueryKeys,
        QueryBuilder? query,
        IOptionsMonitor<GatewayContext> gatewayContext,
        WorkflowEngineClient engineClient,
        ILoggerFactory loggerFactory,
        AuditContext? audit,
        CancellationToken cancellationToken
    )
    {
        if (!AppName.IsValid(app))
        {
            return Problem(
                GatewayProblem.InvalidAppNameType,
                "Invalid app name",
                StatusCodes.Status400BadRequest,
                "The app route parameter must start with a letter and contain only lowercase letters, digits, and hyphens."
            );
        }

        if (FindUnknownQueryKeys(httpContext.Request.Query, allowedQueryKeys) is { } unknownKeys)
        {
            var supported = allowedQueryKeys.Length == 0 ? "none" : string.Join(", ", allowedQueryKeys);
            return Problem(
                GatewayProblem.UnknownQueryParameterType,
                "Unknown query parameter",
                StatusCodes.Status400BadRequest,
                $"Unrecognized query parameter(s): {string.Join(", ", unknownKeys)}. Supported parameter(s): {supported}."
            );
        }

        // Guaranteed non-empty by options validation at startup.
        var serviceOwner = gatewayContext.CurrentValue.ServiceOwner.Trim();

        // The engine namespace is {org}/{app}. It contains a '/', so it must travel as a single
        // escaped path segment (%2F) — unescaped it would address a different engine route.
        var engineNamespace = BuildNamespace(serviceOwner, app);
        var upstreamPath =
            $"api/v1/{Uri.EscapeDataString(engineNamespace)}{upstreamSuffix}{query?.ToQueryString().ToUriComponent()}";

        HttpResponseMessage response;
        try
        {
            response = await engineClient.Send(method, upstreamPath, cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            cancellationToken.ThrowIfCancellationRequested();

            loggerFactory
                .CreateLogger(DiagnosticsLoggerCategory)
                .LogWarning(ex, "Workflow engine unreachable for {Method} {UpstreamPath}", method, upstreamPath);

            if (audit is not null)
                LogAudit(loggerFactory, audit, engineNamespace, outcome: "engine unavailable");

            return Problem(
                GatewayProblem.WorkflowEngineUnavailableType,
                "Workflow engine unavailable",
                StatusCodes.Status502BadGateway,
                "The workflow engine could not be reached. It may not be deployed in this environment."
            );
        }

        if (audit is not null)
            LogAudit(
                loggerFactory,
                audit,
                engineNamespace,
                outcome: ((int)response.StatusCode).ToString(CultureInfo.InvariantCulture)
            );

        return new UpstreamPassthroughResult(response);
    }

#pragma warning disable CA1308 // Engine namespaces are canonically lowercase, not uppercase
    private static string BuildNamespace(string serviceOwner, string app) => $"{serviceOwner.ToLowerInvariant()}/{app}";
#pragma warning restore CA1308

    private static List<string>? FindUnknownQueryKeys(IQueryCollection requestQuery, string[] allowedQueryKeys)
    {
        List<string>? unknownKeys = null;
        foreach (var key in requestQuery.Keys)
        {
            if (!allowedQueryKeys.Contains(key, StringComparer.OrdinalIgnoreCase))
                (unknownKeys ??= []).Add(key);
        }

        return unknownKeys;
    }

    private static void LogAudit(
        ILoggerFactory loggerFactory,
        AuditContext audit,
        string engineNamespace,
        string outcome
    )
    {
        // The engine has no actor concept, so the gateway records who did what. Caller identity
        // comes from the validated Maskinporten token: client_id is the Maskinporten client,
        // consumer carries the organization the token was issued on behalf of.
        var clientId = audit.User.FindFirst("client_id")?.Value ?? "unknown";
        var consumer = audit.User.FindFirst("consumer")?.Value ?? "unknown";

        loggerFactory
            .CreateLogger(AuditLoggerCategory)
            .LogInformation(
                "Workflow mutation: {Verb} on workflow {WorkflowId} in namespace {Namespace} by Maskinporten client {ClientId} (consumer: {Consumer}), outcome: {Outcome}",
                audit.Verb,
                audit.WorkflowId,
                engineNamespace,
                clientId,
                consumer,
                outcome
            );
    }

    private static void AddAll(QueryBuilder query, string name, string[]? values)
    {
        if (values is null)
            return;

        foreach (var value in values)
            query.Add(name, value);
    }

    private static void AddIfPresent(QueryBuilder query, string name, string? value)
    {
        if (value is not null)
            query.Add(name, value);
    }

    private static void AddIfPresent(QueryBuilder query, string name, int? value)
    {
        if (value is not null)
            query.Add(name, value.Value.ToString(CultureInfo.InvariantCulture));
    }

    private static void AddIfPresent(QueryBuilder query, string name, bool? value)
    {
        if (value is not null)
            query.Add(name, value.Value ? "true" : "false");
    }

    /// <summary>
    /// Gateway-produced problem envelope. Serialized via <c>Results.Problem</c> so the wire
    /// shape is standard camelCase problem+json — the <c>type</c> key carries the URN
    /// consumers discriminate on (see <see cref="GatewayProblem"/>).
    /// </summary>
    private static IResult Problem(string type, string title, int status, string detail) =>
        Results.Problem(type: type, title: title, statusCode: status, detail: detail);
}

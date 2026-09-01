using System.Globalization;
using System.Security.Claims;
using System.Text.RegularExpressions;
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
internal static partial class HandleWorkflows
{
    /// <summary>Logger category for the audit lines emitted on the two mutating verbs.</summary>
    internal const string AuditLoggerCategory = "Altinn.Studio.Gateway.Api.WorkflowAudit";

    private const string DiagnosticsLoggerCategory = "Altinn.Studio.Gateway.Api.Application.HandleWorkflows";

    /// <summary>
    /// App names in Studio start with a letter and contain only lowercase letters, digits,
    /// and hyphens (same character set the HelmRelease naming relies on).
    /// </summary>
    [GeneratedRegex("^[a-z][a-z0-9-]{0,62}$")]
    private static partial Regex AppNameRegex();

    internal static Task<IResult> ListCollections(
        string app,
        [FromQuery(Name = "key")] string[]? keys,
        [FromQuery] string? failures,
        [FromQuery] string? cursor,
        [FromQuery] int? pageSize,
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
            app,
            "/collections",
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
        IOptionsMonitor<GatewayContext> gatewayContext,
        WorkflowEngineClient engineClient,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken
    )
    {
        return ForwardToEngine(
            HttpMethod.Get,
            app,
            $"/collections/{Uri.EscapeDataString(key)}",
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
            app,
            "/workflows",
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
        IOptionsMonitor<GatewayContext> gatewayContext,
        WorkflowEngineClient engineClient,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken
    )
    {
        return ForwardToEngine(
            HttpMethod.Get,
            app,
            $"/workflows/{workflowId}",
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
            app,
            $"/workflows/{workflowId}/resume",
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
            app,
            $"/workflows/{workflowId}/abandon",
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
        string app,
        string upstreamSuffix,
        QueryBuilder? query,
        IOptionsMonitor<GatewayContext> gatewayContext,
        WorkflowEngineClient engineClient,
        ILoggerFactory loggerFactory,
        AuditContext? audit,
        CancellationToken cancellationToken
    )
    {
        if (!AppNameRegex().IsMatch(app))
        {
            return Problem(
                GatewayProblem.InvalidAppNameType,
                "Invalid app name",
                StatusCodes.Status400BadRequest,
                "The app route parameter must start with a letter and contain only lowercase letters, digits, and hyphens."
            );
        }

        var serviceOwner = gatewayContext.CurrentValue.ServiceOwner.Trim();
        if (serviceOwner.Length == 0)
        {
            return Problem(
                GatewayProblem.MissingServiceOwnerType,
                "Service owner not configured",
                StatusCodes.Status500InternalServerError,
                "The gateway has no service owner configured, so the workflow engine namespace cannot be determined."
            );
        }

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
                .LogWarning(ex, "Workflow engine unreachable for {Method} {UpstreamPath}", method, upstreamSuffix);

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

    private static IResult Problem(string type, string title, int status, string detail) =>
        Results.Json(
            new GatewayProblem(type, title, status, detail),
            AppJsonSerializerContext.Default.GatewayProblem,
            contentType: "application/problem+json",
            statusCode: status
        );
}

using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Controllers.Admin;

/// <summary>
/// Admin surface for the workflow engine, reached through the runtime gateway's whitelisted
/// pass-through. Gateway/engine responses (status code, content type, JSON body) are forwarded
/// unmodified so the engine DTOs stay the single wire vocabulary — including the gateway's
/// RFC 9457 problem for an unreachable engine (type
/// "urn:altinn:studio:gateway:workflow-engine-unavailable"), which the frontend maps to a
/// distinct "engine unavailable in this environment" state.
/// </summary>
[ApiController]
[Authorize(Policy = AltinnPolicy.MustHaveAdminPermission)]
[Route("designer/api/v1/admin/[controller]/{org}/{env}/{app}")]
public class WorkflowsController : ControllerBase
{
    /// <summary>Logger category for the audit lines emitted on the two mutating verbs.</summary>
    public const string AuditLoggerCategory = "Altinn.Studio.Designer.Admin.WorkflowAudit";

    /// <summary>
    /// Problem type reported when the runtime gateway itself could not be reached from Designer.
    /// Distinct from the gateway-produced "workflow engine unavailable" problem, which passes
    /// through with its own type.
    /// </summary>
    public const string RuntimeGatewayUnavailableType = "urn:altinn:studio:designer:runtime-gateway-unavailable";

    /// <summary>Problem type reported when the environment route parameter is unknown.</summary>
    public const string EnvironmentNotFoundType = "urn:altinn:studio:designer:environment-not-found";

    /// <summary>Problem type reported when the environment route parameter is not a valid environment name.</summary>
    public const string InvalidEnvironmentNameType = "urn:altinn:studio:designer:invalid-environment-name";

    /// <summary>Problem type reported when the app route parameter is not a valid app name.</summary>
    public const string InvalidAppNameType = "urn:altinn:studio:designer:invalid-app-name";

    private readonly IRuntimeGatewayClient _runtimeGatewayClient;
    private readonly ILogger<WorkflowsController> _logger;
    private readonly ILogger _auditLogger;

    public WorkflowsController(
        IRuntimeGatewayClient runtimeGatewayClient,
        ILogger<WorkflowsController> logger,
        ILoggerFactory loggerFactory
    )
    {
        _runtimeGatewayClient = runtimeGatewayClient;
        _logger = logger;
        _auditLogger = loggerFactory.CreateLogger(AuditLoggerCategory);
    }

    [HttpGet("collections")]
    public Task<IActionResult> GetCollections(
        string org,
        string env,
        string app,
        [FromQuery(Name = "key")] string[]? keys,
        [FromQuery] string? failures,
        [FromQuery] string? cursor,
        [FromQuery] int? pageSize,
        CancellationToken cancellationToken
    )
    {
        return ForwardToGatewayAsync(
            org,
            env,
            app,
            (environment, ct) =>
                _runtimeGatewayClient.GetWorkflowCollectionsAsync(
                    org,
                    app,
                    environment,
                    keys,
                    failures,
                    cursor,
                    pageSize,
                    ct
                ),
            audit: null,
            cancellationToken
        );
    }

    [HttpGet("collections/{key}")]
    public Task<IActionResult> GetCollection(
        string org,
        string env,
        string app,
        string key,
        CancellationToken cancellationToken
    )
    {
        return ForwardToGatewayAsync(
            org,
            env,
            app,
            (environment, ct) => _runtimeGatewayClient.GetWorkflowCollectionAsync(org, app, environment, key, ct),
            audit: null,
            cancellationToken
        );
    }

    [HttpGet("workflows")]
    public Task<IActionResult> GetWorkflows(
        string org,
        string env,
        string app,
        [FromQuery] string? collectionKey,
        [FromQuery(Name = "status")] string[]? statuses,
        [FromQuery(Name = "label")] string[]? labels,
        [FromQuery] bool? isHead,
        [FromQuery] string? cursor,
        [FromQuery] int? pageSize,
        CancellationToken cancellationToken
    )
    {
        return ForwardToGatewayAsync(
            org,
            env,
            app,
            (environment, ct) =>
                _runtimeGatewayClient.GetWorkflowsAsync(
                    org,
                    app,
                    environment,
                    collectionKey,
                    statuses,
                    labels,
                    isHead,
                    cursor,
                    pageSize,
                    ct
                ),
            audit: null,
            cancellationToken
        );
    }

    [HttpGet("workflows/{workflowId:guid}")]
    public Task<IActionResult> GetWorkflow(
        string org,
        string env,
        string app,
        Guid workflowId,
        CancellationToken cancellationToken
    )
    {
        return ForwardToGatewayAsync(
            org,
            env,
            app,
            (environment, ct) => _runtimeGatewayClient.GetWorkflowAsync(org, app, environment, workflowId, ct),
            audit: null,
            cancellationToken
        );
    }

    [HttpPost("workflows/{workflowId:guid}/resume")]
    public Task<IActionResult> ResumeWorkflow(
        string org,
        string env,
        string app,
        Guid workflowId,
        [FromQuery] bool? cascade,
        CancellationToken cancellationToken
    )
    {
        return ForwardToGatewayAsync(
            org,
            env,
            app,
            (environment, ct) =>
                _runtimeGatewayClient.ResumeWorkflowAsync(org, app, environment, workflowId, cascade is true, ct),
            new AuditContext("resume", workflowId),
            cancellationToken
        );
    }

    [HttpPost("workflows/{workflowId:guid}/abandon")]
    public Task<IActionResult> AbandonWorkflow(
        string org,
        string env,
        string app,
        Guid workflowId,
        CancellationToken cancellationToken
    )
    {
        return ForwardToGatewayAsync(
            org,
            env,
            app,
            (environment, ct) => _runtimeGatewayClient.AbandonWorkflowAsync(org, app, environment, workflowId, ct),
            new AuditContext("abandon", workflowId),
            cancellationToken
        );
    }

    /// <summary>Verb and workflow id for the audit line emitted on mutations.</summary>
    private sealed record AuditContext(string Verb, Guid WorkflowId);

    private delegate Task<HttpResponseMessage> GatewayCall(
        AltinnEnvironment environment,
        CancellationToken cancellationToken
    );

    private async Task<IActionResult> ForwardToGatewayAsync(
        string org,
        string env,
        string app,
        GatewayCall gatewayCall,
        AuditContext? audit,
        CancellationToken cancellationToken
    )
    {
        if (!AltinnRegexes.AltinnAppNameRegex().IsMatch(app))
        {
            return Problem(
                type: InvalidAppNameType,
                title: "Invalid app name",
                statusCode: StatusCodes.Status400BadRequest,
                detail: "The app route parameter is not a valid app name."
            );
        }

        AltinnEnvironment environment;
        try
        {
            environment = AltinnEnvironment.FromName(env);
        }
        catch (ArgumentException)
        {
            return Problem(
                type: InvalidEnvironmentNameType,
                title: "Invalid environment name",
                statusCode: StatusCodes.Status400BadRequest,
                detail: "The environment route parameter is not a valid environment name."
            );
        }

        HttpResponseMessage response;
        try
        {
            response = await gatewayCall(environment, cancellationToken);
        }
        catch (KeyNotFoundException)
        {
            return Problem(
                type: EnvironmentNotFoundType,
                title: "Environment not found",
                statusCode: StatusCodes.Status404NotFound,
                detail: $"Environment '{environment.Name}' does not exist."
            );
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            return StatusCode(StatusCodes.Status499ClientClosedRequest);
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(
                exception,
                "Runtime gateway unreachable for workflow request in {Org}/{App} ({Environment})",
                org,
                app,
                environment.Name
            );

            if (audit is not null)
            {
                LogAudit(audit, org, environment, app, outcome: "runtime gateway unavailable");
            }

            return Problem(
                type: RuntimeGatewayUnavailableType,
                title: "Runtime gateway unavailable",
                statusCode: StatusCodes.Status502BadGateway,
                detail: "The runtime gateway could not be reached."
            );
        }

        using (response)
        {
            if (audit is not null)
            {
                LogAudit(
                    audit,
                    org,
                    environment,
                    app,
                    outcome: ((int)response.StatusCode).ToString(CultureInfo.InvariantCulture)
                );
            }

            return await PassThroughAsync(response, cancellationToken);
        }
    }

    private async Task<IActionResult> PassThroughAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken
    )
    {
        string body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (string.IsNullOrEmpty(body))
        {
            return StatusCode((int)response.StatusCode);
        }

        return new ContentResult
        {
            StatusCode = (int)response.StatusCode,
            Content = body,
            ContentType = response.Content.Headers.ContentType?.ToString(),
        };
    }

    private void LogAudit(AuditContext audit, string org, AltinnEnvironment environment, string app, string outcome)
    {
        // The gateway only sees Designer's shared Maskinporten client, so this line is the one
        // that attributes the mutation to a human operator.
        string user = AuthenticationHelper.GetDeveloperUserName(HttpContext) ?? "unknown";

        _auditLogger.LogInformation(
            "Workflow mutation: {Verb} on workflow {WorkflowId} in {Org}/{App} ({Environment}) by Studio user {User}, outcome: {Outcome}",
            audit.Verb,
            audit.WorkflowId,
            org,
            app,
            environment.Name,
            user,
            outcome
        );
    }
}

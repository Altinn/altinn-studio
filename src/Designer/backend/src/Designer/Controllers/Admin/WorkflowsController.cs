using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Polly;

namespace Altinn.Studio.Designer.Controllers.Admin;

/// <summary>
/// Admin surface for the workflow engine, reached through the runtime gateway's whitelisted
/// pass-through. Gateway/engine responses (status code, content type, JSON body) are forwarded
/// unmodified, except that the app's workflow state is never served (see
/// <see cref="UpstreamPassthroughResult"/>), and every mutation is recorded in the admin audit log.
/// The engine DTOs thereby stay the single wire vocabulary — including the gateway's
/// RFC 9457 problem for an unreachable engine (type
/// "urn:altinn:studio:gateway:workflow-engine-unavailable"), which the frontend maps to a
/// distinct "engine unavailable in this environment" state.
/// </summary>
[ApiController]
[Authorize(Policy = AltinnPolicy.MustHaveAdminPermission)]
[AutoValidateAntiforgeryToken]
[Route("designer/api/v1/admin/[controller]/{org}/{env}/{app}")]
public class WorkflowsController : ControllerBase
{
    /// <summary>
    /// Logger category for the audit lines emitted on the mutating verbs. Each mutation writes an
    /// attempt line before the gateway call and an outcome line after it, so a mutation that is
    /// canceled or never reaches the gateway is still attributed.
    /// </summary>
    public const string AuditLoggerCategory = "Altinn.Studio.Designer.Admin.WorkflowAudit";

    /// <summary>
    /// Problem type reported when the runtime gateway itself could not be reached from Designer.
    /// Distinct from the gateway-produced "workflow engine unavailable" problem, which passes
    /// through with its own type.
    /// </summary>
    public const string RuntimeGatewayUnavailableType = "urn:altinn:studio:designer:runtime-gateway-unavailable";

    /// <summary>
    /// Problem type reported when the environments registry — the cached environments.json that
    /// resolves an environment to an app cluster address — could not be read, so no gateway call
    /// was attempted. Kept apart from the gateway problems so incident response is not pointed at
    /// the wrong dependency.
    /// </summary>
    public const string EnvironmentsRegistryUnavailableType =
        "urn:altinn:studio:designer:environments-registry-unavailable";

    /// <summary>Problem type reported when the environment route parameter is unknown.</summary>
    public const string EnvironmentNotFoundType = "urn:altinn:studio:designer:environment-not-found";

    /// <summary>Problem type reported when the environment route parameter is not a valid environment name.</summary>
    public const string InvalidEnvironmentNameType = "urn:altinn:studio:designer:invalid-environment-name";

    /// <summary>
    /// Problem type for the defense-in-depth app-name check. Not an HTTP contract: every request
    /// carrying an <c>{app}</c> route value is validated further out in the pipeline, so a
    /// malformed app name never reaches this controller over HTTP. The check guards direct
    /// invocation and any future route that bypasses that validation.
    /// </summary>
    public const string InvalidAppNameType = "urn:altinn:studio:designer:invalid-app-name";

    /// <summary>
    /// Instance id recorded in the audit log when the workflow's own record does not name its
    /// instance. App workflows always do: their collection key is the instance guid.
    /// </summary>
    internal const string UnknownInstanceId = "unknown";

    private readonly IRuntimeGatewayClient _runtimeGatewayClient;
    private readonly IAdminAuditLogger _adminAuditLogger;
    private readonly ILogger<WorkflowsController> _logger;
    private readonly ILogger _auditLogger;

    public WorkflowsController(
        IRuntimeGatewayClient runtimeGatewayClient,
        IAdminAuditLogger adminAuditLogger,
        ILogger<WorkflowsController> logger,
        ILoggerFactory loggerFactory
    )
    {
        _runtimeGatewayClient = runtimeGatewayClient;
        _adminAuditLogger = adminAuditLogger;
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
        [FromQuery] string? role,
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
                    role,
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
            new AuditContext("resume", AdminAuditActions.ResumeWorkflow, workflowId),
            cancellationToken
        );
    }

    [HttpPost("workflows/{workflowId:guid}/nudge")]
    public Task<IActionResult> NudgeWorkflow(
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
            (environment, ct) => _runtimeGatewayClient.NudgeWorkflowAsync(org, app, environment, workflowId, ct),
            new AuditContext("nudge", AdminAuditActions.NudgeWorkflow, workflowId),
            cancellationToken
        );
    }

    /// <summary>
    /// Gives up on a parked workflow. The reason the engine records on the step is composed here and
    /// never taken from the client: it names the Studio user, which is the one thing neither the
    /// gateway nor the engine can know.
    /// </summary>
    [HttpPost("workflows/{workflowId:guid}/fail")]
    public Task<IActionResult> FailWorkflow(
        string org,
        string env,
        string app,
        Guid workflowId,
        CancellationToken cancellationToken
    )
    {
        string reason = $"Failed by Studio user {AuditedUser()} from Altinn Studio";

        return ForwardToGatewayAsync(
            org,
            env,
            app,
            (environment, ct) => _runtimeGatewayClient.FailWorkflowAsync(org, app, environment, workflowId, reason, ct),
            new AuditContext("fail", AdminAuditActions.FailWorkflow, workflowId),
            cancellationToken
        );
    }

    /// <summary>
    /// Verb and workflow id for the audit lines emitted on mutations, and the action recorded in the
    /// admin audit log.
    /// </summary>
    private sealed record AuditContext(string Verb, string Action, Guid WorkflowId);

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

        // Attribution has to be recorded before the call goes out: a mutation that is canceled or
        // never reaches the gateway leaves no outcome line, but the operator still asked for it.
        if (audit is not null)
        {
            LogAuditAttempt(audit, org, environment, app);
        }

        // Every outcome, success or failure, is attributed through Outcome, so a failure mode added
        // later cannot forget the audit line.
        long? auditEntryId = null;
        HttpResponseMessage response;
        try
        {
            if (audit is not null)
            {
                // The admin audit log names the instance the workflow belongs to, as the engine
                // records it rather than as the client claims it, so the workflow is read first. A
                // workflow that cannot be read is not acted on, and the entry is committed before
                // the mutation is sent, so a mutation never happens without one.
                HttpResponseMessage workflowRead = await _runtimeGatewayClient.GetWorkflowAsync(
                    org,
                    app,
                    environment,
                    audit.WorkflowId,
                    cancellationToken
                );
                if (!workflowRead.IsSuccessStatusCode)
                {
                    return Outcome(
                        $"workflow read answered {((int)workflowRead.StatusCode).ToString(CultureInfo.InvariantCulture)}",
                        new UpstreamPassthroughResult(workflowRead, _logger)
                    );
                }

                string instanceId = await ReadInstanceIdAsync(workflowRead, cancellationToken);
                auditEntryId = await _adminAuditLogger.LogWorkflowActionRequestedAsync(
                    org,
                    environment.Name,
                    app,
                    instanceId,
                    audit.WorkflowId,
                    audit.Action,
                    cancellationToken
                );
            }

            response = await gatewayCall(environment, cancellationToken);
        }
        catch (KeyNotFoundException)
        {
            return Outcome(
                "environment not found",
                Problem(
                    type: EnvironmentNotFoundType,
                    title: "Environment not found",
                    statusCode: StatusCodes.Status404NotFound,
                    detail: $"Environment '{environment.Name}' does not exist."
                )
            );
        }
        catch (EnvironmentsRegistryUnavailableException exception)
        {
            _logger.LogWarning(
                exception,
                "Environments registry unavailable for workflow request in {Org}/{App} ({Environment})",
                org.WithoutLineBreaks(),
                app.WithoutLineBreaks(),
                environment.Name.WithoutLineBreaks()
            );

            return Outcome(
                "environments registry unavailable",
                Problem(
                    type: EnvironmentsRegistryUnavailableType,
                    title: "Environments registry unavailable",
                    statusCode: StatusCodes.Status503ServiceUnavailable,
                    detail: "The environments registry could not be read, so the environment address is unknown."
                )
            );
        }
        catch (OperationCanceledException) when (IsClientDisconnect(cancellationToken))
        {
            return Outcome("canceled by client", StatusCode(StatusCodes.Status499ClientClosedRequest));
        }
        catch (Exception exception)
            when (exception is HttpRequestException or TaskCanceledException or ExecutionRejectedException)
        {
            // A client disconnect can surface from the pipeline as any of these, so it is
            // classified first — otherwise an aborted request is blamed on the gateway.
            // ExecutionRejectedException covers the resilience pipeline's own rejections
            // (attempt/total timeout, open circuit, concurrency limiter), which are outages by
            // another name and belong on the same problem type rather than a bare 500.
            if (IsClientDisconnect(cancellationToken))
            {
                return Outcome("canceled by client", StatusCode(StatusCodes.Status499ClientClosedRequest));
            }

            _logger.LogWarning(
                exception,
                "Runtime gateway unreachable for workflow request in {Org}/{App} ({Environment})",
                org.WithoutLineBreaks(),
                app.WithoutLineBreaks(),
                environment.Name.WithoutLineBreaks()
            );

            return Outcome(
                "runtime gateway unavailable",
                Problem(
                    type: RuntimeGatewayUnavailableType,
                    title: "Runtime gateway unavailable",
                    statusCode: StatusCodes.Status502BadGateway,
                    detail: "The runtime gateway could not be reached."
                )
            );
        }

        // An entry left at requested, because the call above threw, has an unknown outcome: the
        // gateway may have reached the engine before the connection or the time ran out.
        if (auditEntryId is { } entryId)
        {
            await RecordMutationOutcomeAsync(entryId, response.IsSuccessStatusCode);
        }

        // Ownership of the buffered response moves to the result, which disposes it after MVC has
        // streamed the body — the action returning here must not dispose it first.
        return Outcome(
            ((int)response.StatusCode).ToString(CultureInfo.InvariantCulture),
            new UpstreamPassthroughResult(response, _logger)
        );

        IActionResult Outcome(string outcome, IActionResult result)
        {
            if (audit is not null)
            {
                LogAuditOutcome(audit, org, environment, app, outcome);
            }

            return result;
        }
    }

    /// <summary>
    /// The instance a workflow belongs to: its collection key, which for an app's workflows is the
    /// instance guid, the id the admin panel and the instance deletion entries use.
    /// </summary>
    private static async Task<string> ReadInstanceIdAsync(
        HttpResponseMessage workflowRead,
        CancellationToken cancellationToken
    )
    {
        using (workflowRead)
        {
            try
            {
                using JsonDocument document = await JsonDocument.ParseAsync(
                    await workflowRead.Content.ReadAsStreamAsync(cancellationToken),
                    cancellationToken: cancellationToken
                );
                return
                    document.RootElement.ValueKind == JsonValueKind.Object
                    && document.RootElement.TryGetProperty("collectionKey", out JsonElement collectionKey)
                    && collectionKey.ValueKind == JsonValueKind.String
                    ? collectionKey.GetString()!
                    : UnknownInstanceId;
            }
            catch (JsonException)
            {
                return UnknownInstanceId;
            }
        }
    }

    /// <summary>
    /// Marks the audit entry with the gateway's answer. The mutation has already happened or been
    /// refused by then, so a failure to write the status is logged and leaves the entry at
    /// requested, rather than hiding the answer from the operator.
    /// </summary>
    private async Task RecordMutationOutcomeAsync(long entryId, bool succeeded)
    {
        try
        {
            if (succeeded)
            {
                await _adminAuditLogger.LogWorkflowActionCompletedAsync(entryId, CancellationToken.None);
            }
            else
            {
                await _adminAuditLogger.LogWorkflowActionFailedAsync(entryId, CancellationToken.None);
            }
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Could not record the outcome of admin audit log entry {EntryId}", entryId);
        }
    }

    private bool IsClientDisconnect(CancellationToken cancellationToken) =>
        cancellationToken.IsCancellationRequested || HttpContext?.RequestAborted.IsCancellationRequested is true;

    private void LogAuditAttempt(AuditContext audit, string org, AltinnEnvironment environment, string app)
    {
        _auditLogger.LogInformation(
            "Workflow mutation attempted: {Verb} on workflow {WorkflowId} in {Org}/{App} ({Environment}) by Studio user {User}",
            audit.Verb,
            audit.WorkflowId,
            org.WithoutLineBreaks(),
            app.WithoutLineBreaks(),
            environment.Name.WithoutLineBreaks(),
            AuditedUser().WithoutLineBreaks()
        );
    }

    private void LogAuditOutcome(
        AuditContext audit,
        string org,
        AltinnEnvironment environment,
        string app,
        string outcome
    )
    {
        _auditLogger.LogInformation(
            "Workflow mutation: {Verb} on workflow {WorkflowId} in {Org}/{App} ({Environment}) by Studio user {User}, outcome: {Outcome}",
            audit.Verb,
            audit.WorkflowId,
            org.WithoutLineBreaks(),
            app.WithoutLineBreaks(),
            environment.Name.WithoutLineBreaks(),
            AuditedUser().WithoutLineBreaks(),
            outcome
        );
    }

    // The gateway only sees Designer's shared Maskinporten client, so the audit lines here are the
    // ones that attribute the mutation to a human operator.
    private string AuditedUser() =>
        (HttpContext is null ? null : AuthenticationHelper.GetDeveloperUserName(HttpContext)) ?? "unknown";
}

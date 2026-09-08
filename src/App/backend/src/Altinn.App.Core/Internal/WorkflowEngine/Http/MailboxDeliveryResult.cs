using System.Net;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine.Http;

/// <summary>
/// The engine's answer to a delivery, carried back verbatim rather than thrown: every status the endpoint
/// documents is a meaningful outcome for the forwarder, which owns the policy for what each one means to the
/// app. Deliberately unlike <see cref="MailboxMintResult"/>, whose one caller must map each outcome to a step
/// verdict — naming these twice would give the status mapping two homes.
/// </summary>
/// <param name="StatusCode">The status the engine answered with.</param>
/// <param name="Body">The parsed response body, present on the <c>202</c>/<c>200</c> outcomes.</param>
/// <param name="ErrorDetail">The response body as text on a non-success status, for diagnostics.</param>
internal sealed record MailboxDeliveryResult(
    HttpStatusCode StatusCode,
    MailboxDeliveryResponse? Body,
    string? ErrorDetail
);

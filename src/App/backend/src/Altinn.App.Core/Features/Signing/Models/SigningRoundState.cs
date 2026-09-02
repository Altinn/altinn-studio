using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Signing.Models;

/// <summary>
/// The JSON content of the <c>signingStateDataType</c> element: the mailbox of the open signing round.
/// </summary>
internal sealed record SigningRoundState(
    [property: JsonPropertyName("taskId")] string TaskId,
    [property: JsonPropertyName("mailboxId")] Guid MailboxId,
    [property: JsonPropertyName("deadline")] DateTimeOffset Deadline
);

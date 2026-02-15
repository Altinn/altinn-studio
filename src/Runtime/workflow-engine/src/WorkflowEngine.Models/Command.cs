using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

// CA1056: URI properties should not be strings
// CA1054: URI parameters should not be strings
// CA1716: Identifiers should not match keywords
// CA1711: Identifiers should not have incorrect suffix
#pragma warning disable CA1054
#pragma warning disable CA1056
#pragma warning disable CA1716
#pragma warning disable CA1711

/// <summary>
/// Describes a command to be executed by the process engine.
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(AppCommand), typeDiscriminator: "app")]
[JsonDerivedType(typeof(Webhook), typeDiscriminator: "webhook")]
public abstract record Command
{
    /// <summary>
    /// An identifier for this operation
    /// </summary>
    public string OperationId { get; init; }

    /// <summary>
    /// The maximum allowed execution time for the command.
    /// If the command does not complete within this time, it will be considered failed.
    /// </summary>
    [JsonPropertyName("maxExecutionTime")]
    public TimeSpan? MaxExecutionTime { get; init; }

    private Command(string operationId, TimeSpan? maxExecutionTime = null)
    {
        OperationId = operationId;
        MaxExecutionTime = maxExecutionTime;
    }

    /// <summary>
    /// A command that gets handled by the calling application (via webhook).
    /// </summary>
    /// <param name="CommandKey">The command key. A unique identifier that is understood by the app's webhook receiver</param>
    /// <param name="Payload">Optional payload to send back with the command. If specified this becomes a POST request. Otherwise, GET.</param>
    /// <param name="MaxExecutionTime">The maximum allowed execution time for the command.</param>
    public sealed record AppCommand(
        [property: JsonPropertyName("commandKey")] string CommandKey,
        [property: JsonPropertyName("payload")] string? Payload = null,
        TimeSpan? MaxExecutionTime = null
    ) : Command(CommandKey, MaxExecutionTime);

    /// <summary>
    /// A command that performs a webhook callback to the specified URI with an optional payload.
    /// </summary>
    /// <remarks>Currently only used for debugging, but otherwise a potentially useful command type in general.</remarks>
    /// <param name="Uri">The uri to call.</param>
    /// <param name="Payload">An optional payload string. If provided, a POST request will be issued. Otherwise, GET.</param>
    /// <param name="ContentType">The value to send along with the request in the Content-Type header.</param>
    /// <param name="MaxExecutionTime">The maximum allowed execution time for the command.</param>
    public sealed record Webhook(
        [property: JsonPropertyName("uri")] string Uri,
        [property: JsonPropertyName("payload")] string? Payload = null,
        [property: JsonPropertyName("contentType")] string? ContentType = null,
        TimeSpan? MaxExecutionTime = null
    ) : Command("webhook", MaxExecutionTime);

    /// <summary>
    /// Commands used for testing and debugging purposes.
    /// </summary>
    public static class Debug
    {
        /// <summary>
        /// A command that throws an exception when executed.
        /// </summary>
        public sealed record Throw() : Command("throw");

        /// <summary>
        /// A command that performs no operation, simply returns a completed task.
        /// </summary>
        public sealed record Noop() : Command("noop");

        /// <summary>
        /// A command that performs a timeout/delay when executed.
        /// </summary>
        /// <param name="Duration">The timeout duration.</param>
        /// <param name="MaxExecutionTime">The maximum allowed execution time for the command.</param>
        public sealed record Timeout(
            [property: JsonPropertyName("duration")] TimeSpan Duration,
            TimeSpan? MaxExecutionTime = null
        ) : Command("timeout", MaxExecutionTime);

        /// <summary>
        /// Debug: A command that executes a delegate function.
        /// </summary>
        /// <param name="Action">The delegate method</param>
        /// <param name="MaxExecutionTime">The maximum allowed execution time for the command.</param>
        public sealed record Delegate(
            Func<Workflow, Step, CancellationToken, Task> Action,
            TimeSpan? MaxExecutionTime = null
        ) : Command("delegate", MaxExecutionTime);
    }

    /// <inheritdoc/>
    public sealed override string ToString() => OperationId;
}

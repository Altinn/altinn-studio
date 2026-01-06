using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Describes a command to be executed by the process engine.
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(AppCommand), typeDiscriminator: "app")]
[JsonDerivedType(typeof(Webhook), typeDiscriminator: "webhook")]
public abstract record Command
{
    /// <summary>
    /// A general description of this command, used for log output etc.
    /// </summary>
    [JsonIgnore]
    public string? Description { get; init; }

    /// <summary>
    /// The maximum allowed execution time for the command.
    /// If the command does not complete within this time, it will be considered failed.
    /// </summary>
    [JsonPropertyName("maxExecutionTime")]
    public TimeSpan? MaxExecutionTime { get; init; }

    private Command(string description, TimeSpan? maxExecutionTime = null)
    {
        Description = description;
        MaxExecutionTime = maxExecutionTime;
    }

    /// <summary>
    /// A command that gets handled by the calling application (via webhook).
    /// </summary>
    /// <param name="CommandKey">The command key. A unique identifier that is understood by the app's webhook receiver</param>
    /// <param name="Metadata">Optional metadata to send back with the command. If specified this becomes a POST request. Otherwise, GET.</param>
    /// <param name="MaxExecutionTime">The maximum allowed execution time for the command.</param>
    public sealed record AppCommand(
        [property: JsonPropertyName("commandKey")] string CommandKey,
        [property: JsonPropertyName("metadata")] string? Metadata = null,
        TimeSpan? MaxExecutionTime = null
    ) : Command(CommandKey, MaxExecutionTime);

    /// <summary>
    /// Debug: A command that throws an exception when executed.
    /// </summary>
    internal sealed record Throw() : Command("throw");

    /// <summary>
    /// Debug: A command that performs no operation, simply returns a completed task.
    /// </summary>
    internal sealed record Noop() : Command("noop");

    /// <summary>
    /// Debug: A command that performs a timeout/delay when executed.
    /// </summary>
    /// <param name="Duration">The timeout duration.</param>
    /// <param name="MaxExecutionTime">The maximum allowed execution time for the command.</param>
    internal sealed record Timeout(
        [property: JsonPropertyName("duration")] TimeSpan Duration,
        TimeSpan? MaxExecutionTime = null
    ) : Command("timeout", MaxExecutionTime);

    /// <summary>
    /// A command that performs a webhook callback to the specified URI with an optional payload.
    /// </summary>
    /// <remarks>Currently only used for debugging, but otherwise a potentially useful command type in general.</remarks>
    /// <param name="Uri">The uri to call.</param>
    /// <param name="Payload">An optional payload string. If provided, a POST request will be issued. Otherwise, GET.</param>
    /// <param name="ContentType">The value to send along with the request in the Content-Type header.</param>
    /// <param name="MaxExecutionTime">The maximum allowed execution time for the command.</param>
    internal sealed record Webhook(
        [property: JsonPropertyName("uri")] string Uri,
        [property: JsonPropertyName("payload")] string? Payload = null,
        [property: JsonPropertyName("contentType")] string? ContentType = null,
        TimeSpan? MaxExecutionTime = null
    ) : Command("webhook", MaxExecutionTime);

    /// <summary>
    /// Debug: A command that executes a delegate function.
    /// </summary>
    /// <param name="Action">The delegate method</param>
    /// <param name="MaxExecutionTime">The maximum allowed execution time for the command.</param>
    internal sealed record Delegate(
        Func<Workflow, Step, CancellationToken, System.Threading.Tasks.Task> Action,
        TimeSpan? MaxExecutionTime = null
    ) : Command("delegate", MaxExecutionTime);

    /// <inheritdoc/>
    public sealed override string ToString() => Description ?? GetType().Name;
}

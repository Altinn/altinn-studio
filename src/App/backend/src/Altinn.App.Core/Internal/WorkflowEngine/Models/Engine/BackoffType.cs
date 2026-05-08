using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Defines backoff types for retry strategies.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum BackoffType
{
    /// <summary>
    /// Constant backoff type. The delay between retries remains the same regardless of the number of attempts.
    /// </summary>
    Constant = 0,

    /// <summary>
    /// Linear backoff type. The delay between retries increases linearly with each attempt.
    /// </summary>
    Linear = 1,

    /// <summary>
    /// Exponential backoff type. The delay between retries increases exponentially with each attempt.
    /// </summary>
    Exponential = 2,
}

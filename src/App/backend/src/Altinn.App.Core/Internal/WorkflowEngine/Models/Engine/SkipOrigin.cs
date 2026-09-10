using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Who caused a skip: the command's own outcome, or a manual skip through the engine's skip endpoint. Recorded
/// beside <see cref="StepStatusResponse.SkipReason"/>, which is a machine-readable code in the first case and
/// free text in the second, so a consumer classifies on the code only when the origin is <see cref="Command"/>.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
internal enum SkipOrigin
{
    /// <summary>The step's command returned the skip outcome.</summary>
    Command = 1,

    /// <summary>An operator skipped the workflow through the engine's skip endpoint.</summary>
    Manual = 2,
}

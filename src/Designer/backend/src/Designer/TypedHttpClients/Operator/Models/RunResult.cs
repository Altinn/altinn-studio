using System.Text.Json;

namespace Altinn.Studio.Designer.TypedHttpClients.Operator.Models;

/// <summary>
/// What the command of a run that completed produced.
/// </summary>
/// <param name="ExitCode">The exit code of the command, or null when it timed out.</param>
/// <param name="TimedOut">Whether the command ran longer than its kind allows.</param>
/// <param name="Stdout">The command's standard output.</param>
/// <param name="Stderr">The command's standard error.</param>
/// <param name="Report">
/// The JSON object the command wrote for the caller, or null when its kind has none or the command stopped before it
/// wrote one. Its shape belongs to the kind. Read it with <see cref="ReadReport{T}"/>.
/// </param>
/// <param name="Patch">
/// The changes the command made to the app, as a binary git patch, or null when the kind does not change the app or
/// the command timed out. The job host refused symbolic links, submodules, CI workflows and git attribute files. Apply
/// it with <c>git apply</c>, which refuses paths outside the repository.
/// </param>
internal sealed record RunResult(
    int? ExitCode,
    bool TimedOut,
    string Stdout,
    string Stderr,
    JsonElement? Report,
    byte[]? Patch
)
{
    private static readonly JsonSerializerOptions s_reportOptions = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// Reads <see cref="Report"/> as the report of the run's kind, such as <see cref="UpgradeReport"/> for
    /// <c>upgrade-v9</c>. Returns null when the run has no report.
    /// </summary>
    /// <exception cref="JsonException">The report does not have the shape of <typeparamref name="T"/>.</exception>
    public T? ReadReport<T>()
        where T : class =>
        Report is { ValueKind: JsonValueKind.Object } report ? report.Deserialize<T>(s_reportOptions) : null;
}

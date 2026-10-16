using System.Text.Json;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// How a side effect's input travels: JSON with the web defaults of <c>System.Text.Json</c>, written when the side
/// effect is started and read by <see cref="ServiceTaskContext.GetInput{T}"/>.
/// </summary>
internal static class SideEffectInput
{
    private static readonly JsonSerializerOptions _options = new(JsonSerializerDefaults.Web);

    public static string? Serialize(object? input) =>
        input is null ? null : JsonSerializer.Serialize(input, input.GetType(), _options);

    public static T? Deserialize<T>(string? input) =>
        input is null ? default : JsonSerializer.Deserialize<T>(input, _options);
}

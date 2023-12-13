using System.Diagnostics.CodeAnalysis;

namespace Altinn.App.Core.Helpers.Serialization;

/// <summary>
/// Result used by <see cref="ModelDeserializer"/> to indicate the result type
/// </summary>
public class ModelDeserializerResult
{
    /// <summary>
    /// Static factory method to make an object that represents a successfull deserialization
    /// If the model is null, set default error message instead (eg: json string "null", deserialize valid to null without exception)
    /// </summary>
    public static ModelDeserializerResult FromSuccess(object? model, Dictionary<string, string?>? reportedChanges = null) => new()
    {
        Error = model is null ? "Model deserialzied to \"null\"" : null,
        Model = model,
        ReportedChanges = model is null ? null : reportedChanges,
    };
    /// <summary>
    /// Static factory method to make an object that represents a failed deserialization
    /// </summary>
    public static ModelDeserializerResult FromError(string error) => new()
    {
        Error = error,
    };

    // private constructor to ensure that invariant is preserved through static factory methods
    private ModelDeserializerResult() { }

    /// <summary>
    /// Utility function to check if the result has errors and set 
    /// </summary>
    /// <example>
    /// <code>
    /// if(!result.HasError)
    /// {
    ///     //result.Model is not null here
    /// }
    /// else
    /// {
    ///     //result.Error is not null here
    /// }
    /// </code>
    /// </example>
    [MemberNotNullWhen(true, nameof(Error))]
    [MemberNotNullWhen(false, nameof(Model))]
    public bool HasError => Error is not null;
    /// <summary>
    /// Potential error message, If this is set, the other values are null
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// The actual parsed model
    /// </summary>
    public object? Model { get; set; }

    /// <summary>
    /// Dictionary with fields and their changed parts
    /// </summary>
    public Dictionary<string, string?>? ReportedChanges { get; set; }

}
namespace Altinn.App.Core.Internal.Patch;

/// <summary>
/// Error that can be returned from the <see cref="IPatchService"/> when a patch operation fails.
/// </summary>
public class DataPatchError
{
    /// <summary>
    /// The title of the error.
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// A detailed description of the error.
    /// </summary>
    public string? Detail { get; set; }

    /// <summary>
    /// The type of error that occurred.
    /// </summary>
    public DataPatchErrorType? ErrorType { get; set; }

    /// <summary>
    /// Additional information about the error.
    /// </summary>
    public IDictionary<string, object?>? Extensions { get; set; }
}

/// <summary>
/// The type of error that occurred during a data patch operation.
/// </summary>
public enum DataPatchErrorType
{
    /// <summary>
    /// One or more of the JsonPatch tests failed.
    /// </summary>
    PatchTestFailed,

    /// <summary>
    /// The patch operation lead to an invalid data model.
    /// </summary>
    DeserializationFailed,
}

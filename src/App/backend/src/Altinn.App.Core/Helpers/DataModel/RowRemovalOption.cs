// ReSharper disable once CheckNamespace // Namespace is kept after refactoring
namespace Altinn.App.Core.Helpers;

/// <summary>
/// Option for how to handle row removal
/// </summary>
public enum RowRemovalOption
{
    /// <summary>
    /// Remove the row from the data model
    /// </summary>
    DeleteRow,

    /// <summary>
    /// Set the row to null, used to preserve row indices
    /// </summary>
    SetToNull,

    /// <summary>
    /// Ignore row removal
    /// </summary>
    Ignore,
}

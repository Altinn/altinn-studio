using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Rejects data from clients that changes properties with a fixed value (typically XSD attributes with fixed="..."),
/// and restores the fixed values in data that is accepted.
/// </summary>
/// <remarks>
/// Data loaded from storage is never checked, so instances stored with other fixed values still load.
/// When the previous version of the data is known, only new mismatches are reported. Such instances can
/// still be edited as long as the client does not change the fixed values further, and the fixed values
/// are corrected when the client saves.
/// </remarks>
internal static class FixedValueValidator
{
    /// <summary>
    /// Restore the fixed values in <paramref name="current"/> and find the mismatches that were not already present in <paramref name="previous"/>.
    /// </summary>
    /// <param name="current">The data received from the client. Fixed values are set back to the declared value.</param>
    /// <param name="previous">The stored data the client is replacing, or null when creating new data. Left unchanged.</param>
    /// <returns>Mismatches caused by the client. When empty, <paramref name="current"/> can be saved.</returns>
    public static IReadOnlyList<FixedValueError> RestoreFixedValues(
        IFormDataWrapper current,
        IFormDataWrapper? previous
    )
    {
        var errors = current.RestoreFixedValues();
        if (errors.Count == 0 || previous is null)
        {
            return errors;
        }

        // Restore on a copy, so that the stored data stays as is for change detection and data processors
        var previousErrors = previous.Copy().RestoreFixedValues();
        if (previousErrors.Count == 0)
        {
            return errors;
        }

        return errors.Where(error => !previousErrors.Contains(error)).ToList();
    }

    /// <summary>
    /// Create the error response for fixed value mismatches
    /// </summary>
    public static ProblemDetails ToProblemDetails(IReadOnlyList<FixedValueError> errors)
    {
        return new ProblemDetails()
        {
            Title = "Fixed value mismatch",
            Detail = string.Join(" ", errors),
            Status = StatusCodes.Status400BadRequest,
        };
    }
}

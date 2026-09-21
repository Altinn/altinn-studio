using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Rejects data from clients that changes properties with a fixed value (typically XSD attributes with fixed="...").
/// </summary>
/// <remarks>
/// Data loaded from storage is never checked, so instances stored with other fixed values still load.
/// When the previous version of the data is known, only new mismatches are reported, so such instances
/// can still be edited as long as the client does not change the fixed values further.
/// </remarks>
internal static class FixedValueValidator
{
    /// <summary>
    /// Find fixed value mismatches in <paramref name="current"/> that are not already present in <paramref name="previous"/>.
    /// </summary>
    /// <param name="current">The data received from the client</param>
    /// <param name="previous">The stored data the client is replacing, or null when creating new data</param>
    public static IReadOnlyList<FixedValueError> GetNewErrors(IFormDataWrapper current, IFormDataWrapper? previous)
    {
        var errors = current.ValidateFixedValues();
        if (errors.Count == 0 || previous is null)
        {
            return errors;
        }

        var previousErrors = previous.ValidateFixedValues();
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

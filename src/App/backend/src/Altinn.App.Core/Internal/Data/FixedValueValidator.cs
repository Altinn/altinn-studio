using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Error response for data from clients that changes properties with a fixed value (typically XSD attributes with fixed="...").
/// </summary>
internal static class FixedValueValidator
{
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

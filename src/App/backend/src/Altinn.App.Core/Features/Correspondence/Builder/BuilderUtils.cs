using System.Diagnostics.CodeAnalysis;
using System.Runtime.CompilerServices;
using Altinn.App.Core.Features.Correspondence.Exceptions;

namespace Altinn.App.Core.Features.Correspondence.Builder;

internal static class BuilderUtils
{
    /// <summary>
    /// <p>Because of the interface-chaining in this builder, some properties are guaranteed to be non-null.
    /// But the compiler doesn't trust that, so we add this check where needed.</p>
    /// <p>Additionally, this method checks for empty strings and empty data allocations.</p>
    /// </summary>
    /// <param name="value">The value to assert</param>
    /// <param name="errorMessage">The error message to throw, if the value was null</param>
    /// <exception cref="CorrespondenceArgumentException"></exception>
    internal static void NotNullOrEmpty([NotNull] object? value, string? errorMessage = null)
    {
        if (
            value is null
            || value is string str && string.IsNullOrWhiteSpace(str)
            || value is ReadOnlyMemory<byte> { IsEmpty: true }
            || value is DateTimeOffset dt && dt == DateTimeOffset.MinValue
        )
        {
            throw new CorrespondenceArgumentException(errorMessage);
        }
    }

    internal static void RequireAtLeastOneOf<T1, T2>(
        T1? value1,
        T2? value2,
        string? errorMessage = null,
        [CallerArgumentExpression(nameof(value1))] string? value1Name = null,
        [CallerArgumentExpression(nameof(value2))] string? value2Name = null
    )
    {
        if (value1 is null && value2 is null)
        {
            var message = errorMessage ?? $"At least one of {value1Name} or {value2Name} must be set.";
            throw new CorrespondenceArgumentException(message);
        }
    }

    internal static void RequireExactlyOneOf<T1, T2>(
        T1? value1,
        T2? value2,
        string? errorMessage = null,
        [CallerArgumentExpression(nameof(value1))] string? value1Name = null,
        [CallerArgumentExpression(nameof(value2))] string? value2Name = null
    )
    {
        if ((value1 is not null && value2 is not null) || (value1 is null && value2 is null))
        {
            var message = errorMessage ?? $"Exactly one of {value1Name} or {value2Name} must be set.";
            throw new CorrespondenceArgumentException(message);
        }
    }
}

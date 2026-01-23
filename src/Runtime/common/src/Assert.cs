using System.Diagnostics.CodeAnalysis;
using System.Runtime.CompilerServices;

namespace Common;

public static class Assert
{
    /// <summary>
    /// Assertion helper that runs in all builds and environments.
    /// </summary>
    /// <exception cref="InvalidOperationException">Thrown when the assertion condition is false.</exception>
    public static void That(
        [DoesNotReturnIf(false)] bool condition,
        string? message = null,
        [CallerFilePath] string? filePath = null,
        [CallerLineNumber] int lineNumber = 0
    )
    {
        if (!condition)
        {
            var location = $"{filePath}:{lineNumber}";
            var errorMessage = message is not null
                ? $"{message} at {location}"
                : $"Assertion failed at {location}";
            throw new InvalidOperationException(errorMessage);
        }
    }
}

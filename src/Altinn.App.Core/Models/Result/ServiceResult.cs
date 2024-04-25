using System.Diagnostics.CodeAnalysis;

namespace Altinn.App.Core.Models.Result;

/// <summary>
/// Result type that can be used when a method can return a value or an error
/// </summary>
/// <typeparam name="T">Type returned when Ok result</typeparam>
/// <typeparam name="TU">Type returned when Error result</typeparam>
public class ServiceResult<T, TU>
{
    /// <summary>
    /// The value returned when the result is Ok
    /// </summary>
    public T? Ok { get; }

    /// <summary>
    /// The error returned when the result is an error
    /// </summary>
    public TU? Error { get; }

    /// <summary>
    /// Whether the result is Ok or an Error
    /// </summary>
    [MemberNotNullWhen(true, nameof(Ok))]
    [MemberNotNullWhen(false, nameof(Error))]
    public bool Success { get; }

    private ServiceResult(T? ok, TU? error, bool success)
    {
        Ok = ok;
        Error = error;
        Success = success;
    }

    /// <summary>
    /// Implicitly create a ServiceResult with a ok result
    /// </summary>
    /// <returns></returns>
    public static implicit operator ServiceResult<T, TU>(T okData) => new(okData, default, true);

    /// <summary>
    /// Implicitly create a ServiceResult with an error result
    /// </summary>
    /// <returns></returns>
    public static implicit operator ServiceResult<T, TU>(TU error) => new(default, error, false);
}

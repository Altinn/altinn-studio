#nullable enable
namespace Altinn.Notifications.Core.Shared;

/// <summary>
/// A simple implementation of the Result class to handle success XOR failure as separate return 
/// values in a type safe way. 
/// </summary>
/// <typeparam name="TValue">The type to be assigned to indicate success.</typeparam>
/// <typeparam name="TError">The type to be assigned to indicate failure.</typeparam>
public readonly struct Result<TValue, TError>
{
    private readonly TValue? _value;
    private readonly TError? _error;

    private Result(TValue value)
    {
        IsError = false;
        _value = value;
        _error = default;
    }

    private Result(TError error)
    {
        IsError = true;
        _value = default;
        _error = error;
    }

    /// <summary>
    /// Gets a value indicating whether the Result contains an error value.
    /// </summary>
    public bool IsError { get; }

    /// <summary>
    /// Gets a value indicating whether the Result contains a success value.
    /// </summary>
    public bool IsSuccess => !IsError;

    /// <summary>
    /// Implicit operator used when creating an instance of Result when assigning a success value.
    /// </summary>
    /// <param name="value">An object of the type indicating success.</param>
    public static implicit operator Result<TValue, TError>(TValue value) => new(value);

    /// <summary>
    /// Implicit operator used when creating an instance of Result when assigning an error value.
    /// </summary>
    /// <param name="error">An object of the type indicating failure.</param>
    public static implicit operator Result<TValue, TError>(TError error) => new(error);

    /// <summary>
    /// This method will call either the success OR the failure function based on it's error state.
    /// </summary>
    /// <typeparam name="TResult">The type to be returned by the given functions.</typeparam>
    /// <param name="success">The function to call if Result holds a success value.</param>
    /// <param name="failure">The function to call if Result holds an error value.</param>
    /// <returns>An instance of the defined type.</returns>
    public TResult Match<TResult>(
        Func<TValue, TResult> success,
        Func<TError, TResult> failure) =>
        !IsError ? success(_value!) : failure(_error!);
}

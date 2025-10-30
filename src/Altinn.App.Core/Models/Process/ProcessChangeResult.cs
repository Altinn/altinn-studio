using System.Diagnostics.CodeAnalysis;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Models.Process;

/// <summary>
/// Class representing the result of a process change
/// </summary>
public class ProcessChangeResult
{
    /// <summary>
    /// Gets or sets a value indicating whether the process change was successful
    /// </summary>
    [MemberNotNullWhen(true, nameof(ProcessStateChange))]
    [MemberNotNullWhen(false, nameof(ErrorMessage), nameof(ErrorType))]
    public bool Success { get; init; }

    /// <summary>
    /// Gets or sets the error title if the process change was not successful
    /// </summary>
    public string? ErrorTitle { get; set; }

    /// <summary>
    /// Gets or sets the error message if the process change was not successful
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// Validation issues that occurred during the process change
    /// </summary>
    public List<ValidationIssueWithSource>? ValidationIssues { get; set; }

    /// <summary>
    /// Gets or sets the error type if the process change was not successful
    /// </summary>
    public ProcessErrorType? ErrorType { get; init; }

    /// <summary>
    /// Gets or sets the process state change if the process change was successful
    /// </summary>
    public ProcessStateChange? ProcessStateChange { get; init; }
}

/// <summary>
/// Types of errors that can occur during a process change
/// </summary>
public enum ProcessErrorType
{
    /// <summary>
    /// The process change was not allowed due to the current state of the process
    /// </summary>
    Conflict,

    /// <summary>
    /// The process change lead to an internal error
    /// </summary>
    Internal,

    /// <summary>
    /// The user is not authorized to perform the process change
    /// </summary>
    Unauthorized,

    /// <summary>
    /// The request was not valid
    /// </summary>
    BadRequest,
}

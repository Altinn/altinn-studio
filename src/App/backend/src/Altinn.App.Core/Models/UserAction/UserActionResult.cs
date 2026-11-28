using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Models.UserAction;

/// <summary>
/// Represents the result of a user action
/// </summary>
public enum ResultType
{
    /// <summary>
    /// The user action succeeded
    /// </summary>
    Success,

    /// <summary>
    /// The user action failed
    /// </summary>
    Failure,

    /// <summary>
    /// The client should redirect the user to a new url
    /// </summary>
    Redirect,
}

/// <summary>
/// Represents the result of a user action
/// </summary>
public sealed class UserActionResult
{
    /// <summary>
    /// Gets or sets a value indicating whether the user action was a success
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Indicates the type of result
    /// </summary>
    public ResultType ResultType { get; set; }

    /// <summary>
    /// Actions for the client to perform after the user action has been handled
    /// </summary>
    public List<ClientAction>? ClientActions { get; set; }

    /// <summary>
    /// Validation issues that should be displayed to the user
    /// </summary>
    public ActionError? Error { get; set; }

    /// <summary>
    /// Validation issues that made the action fail, returned to the client. Their text keys are translated, and the
    /// first issue becomes the <see cref="Error"/> when that is not set.
    /// </summary>
    public List<ValidationIssue>? ValidationIssues { get; set; }

    /// <summary>
    /// Error type to return when the user action was not successful
    /// </summary>
    public ProcessErrorType? ErrorType { get; set; }

    /// <summary>
    /// If this is set, the client should redirect to this url
    /// </summary>
    public Uri? RedirectUrl { get; set; }

    /// <summary>
    /// Creates a success result
    /// </summary>
    /// <param name="clientActions"></param>
    /// <returns></returns>
    public static UserActionResult SuccessResult(List<ClientAction>? clientActions = null)
    {
        return new UserActionResult
        {
            Success = true,
            ResultType = ResultType.Success,
            ClientActions = clientActions,
        };
    }

    /// <summary>
    /// Creates a failure result
    /// </summary>
    /// <returns></returns>
    public static UserActionResult FailureResult(
        ActionError error,
        List<ClientAction>? clientActions = null,
        ProcessErrorType errorType = ProcessErrorType.Internal
    )
    {
        return new UserActionResult
        {
            ResultType = ResultType.Failure,
            ClientActions = clientActions,
            Error = error,
            ErrorType = errorType,
        };
    }

    /// <summary>
    /// Creates a failure result with validation issues to show the user. The issues are returned to the client with
    /// their text keys translated, and the first one is also returned as the <see cref="Error"/>.
    /// </summary>
    /// <param name="validationIssues">The issues that made the action fail. At least one is required.</param>
    /// <param name="clientActions">Actions for the client to perform</param>
    /// <param name="errorType">The type of error, which sets the status code. Defaults to bad request.</param>
    /// <exception cref="ArgumentException">If <paramref name="validationIssues"/> is empty</exception>
    public static UserActionResult FailureResult(
        List<ValidationIssue> validationIssues,
        List<ClientAction>? clientActions = null,
        ProcessErrorType errorType = ProcessErrorType.BadRequest
    )
    {
        ArgumentNullException.ThrowIfNull(validationIssues);
        if (validationIssues.Count == 0)
        {
            throw new ArgumentException("At least one validation issue is required", nameof(validationIssues));
        }

        return new UserActionResult
        {
            ResultType = ResultType.Failure,
            ClientActions = clientActions,
            ValidationIssues = validationIssues,
            ErrorType = errorType,
        };
    }

    /// <summary>
    /// Creates a redirect result
    /// </summary>
    /// <param name="redirectUrl"></param>
    /// <returns></returns>
    public static UserActionResult RedirectResult(Uri redirectUrl)
    {
        return new UserActionResult
        {
            Success = true,
            ResultType = ResultType.Redirect,
            RedirectUrl = redirectUrl,
        };
    }
}

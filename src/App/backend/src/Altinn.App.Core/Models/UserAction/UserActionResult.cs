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

    /// <summary>
    /// Creates the failure result for an action that called <see cref="Features.IInstanceDataMutator.AbandonAllChanges"/>.
    /// The first issue gives the error message, as its text key or description.
    /// </summary>
    internal static UserActionResult AbandonedResult(IReadOnlyList<ValidationIssue> abandonIssues)
    {
        var issue = abandonIssues[0];
        return FailureResult(
            new ActionError
            {
                Code = issue.Code,
                Message = issue.CustomTextKey ?? issue.Description ?? issue.Code ?? "Changes were abandoned",
            },
            errorType: ProcessErrorType.BadRequest
        );
    }
}

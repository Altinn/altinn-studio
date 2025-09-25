using Altinn.App.Core.Models.Process;

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
    /// Gets or sets a dictionary of updated data models. Key should be elementId and value should be the updated data model
    /// </summary>
    [Obsolete(
        "Updates done to data from UserActionContext.DataMutator is tracked and don't need to be returned in the response"
    )]
    public Dictionary<string, object>? UpdatedDataModels { get; set; }

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
    /// Adds an updated data model to the result
    /// </summary>
    /// <param name="dataModelId"></param>
    /// <param name="dataModel"></param>
    [Obsolete(
        "Updates done to data from UserActionContext.DataMutator is tracked and don't need to be returned in the response"
    )]
    public void AddUpdatedDataModel(string dataModelId, object dataModel)
    {
        if (UpdatedDataModels == null)
        {
            UpdatedDataModels = new Dictionary<string, object>();
        }
        UpdatedDataModels.Add(dataModelId, dataModel);
    }
}

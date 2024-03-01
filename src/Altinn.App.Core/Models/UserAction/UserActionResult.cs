
namespace Altinn.App.Core.Models.UserAction;

/// <summary>
/// Represents the result of a user action
/// </summary>
public class UserActionResult
{
    /// <summary>
    /// Gets or sets a value indicating whether the user action was a success
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Gets or sets a dictionary of updated data models. Key should be elementId and value should be the updated data model
    /// </summary>
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
    /// Creates a success result
    /// </summary>
    /// <param name="clientActions"></param>
    /// <returns></returns>
    public static UserActionResult SuccessResult(List<ClientAction>? clientActions = null)
    {
        var userActionResult = new UserActionResult
        {
            Success = true,
            ClientActions = clientActions
        };
        return userActionResult;
    }

    /// <summary>
    /// Creates a failure result
    /// </summary>
    /// <param name="error"></param>
    /// <param name="clientActions"></param>
    /// <returns></returns>
    public static UserActionResult FailureResult(ActionError error, List<ClientAction>? clientActions = null)
    {
        return new UserActionResult
        {
            Success = false,
            ClientActions = clientActions,
            Error = error
        };
    }

    /// <summary>
    /// Adds an updated data model to the result
    /// </summary>
    /// <param name="dataModelId"></param>
    /// <param name="dataModel"></param>
    public void AddUpdatedDataModel(string dataModelId, object dataModel)
    {
        if (UpdatedDataModels == null)
        {
            UpdatedDataModels = new Dictionary<string, object>();
        }
        UpdatedDataModels.Add(dataModelId, dataModel);
    }
}

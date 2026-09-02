using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models.UserAction;

/// <summary>
/// Context for user actions
/// </summary>
public class UserActionContext
{
    /// <summary>
    /// Creates a new instance of the <see cref="UserActionContext"/> class
    /// </summary>
    /// <param name="dataMutator">The instance the action is performed on</param>
    /// <param name="userId">The user performing the action</param>
    /// <param name="buttonId">The id of the button that triggered the action (optional)</param>
    /// <param name="actionMetadata"></param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <param name="authentication">Information about the authenticated party</param>
    /// <param name="onBehalfOf">The organization number of the party the user is acting on behalf of</param>
    /// <param name="cancellationToken">The cancellation token</param>
    public UserActionContext(
        IInstanceDataMutator dataMutator,
        int? userId,
        string? buttonId = null,
        Dictionary<string, string>? actionMetadata = null,
        string? language = null,
        Authenticated? authentication = null,
        string? onBehalfOf = null,
        CancellationToken? cancellationToken = null
    )
    {
        Instance = dataMutator.Instance;
        DataMutator = dataMutator;
        _userId = userId;
        Authentication = authentication;
        OnBehalfOf = onBehalfOf;
        ButtonId = buttonId;
        ActionMetadata = actionMetadata ?? [];
        Language = language;
        CancellationToken = cancellationToken ?? default;
    }

    /// <summary>
    /// Creates a new instance of the <see cref="UserActionContext"/> class
    /// </summary>
    /// <param name="instance">The instance the action is performed on</param>
    /// <param name="userId">The user performing the action</param>
    /// <param name="buttonId">The id of the button that triggered the action (optional)</param>
    /// <param name="actionMetadata"></param>
    /// <param name="language">The currently used language by the user (or null if not available)</param>
    /// <param name="authentication">Information about the authenticated party</param>
    [Obsolete("Use the constructor with IInstanceDataAccessor instead")]
    public UserActionContext(
        Instance instance,
        int? userId,
        string? buttonId = null,
        Dictionary<string, string>? actionMetadata = null,
        string? language = null,
        Authenticated? authentication = null
    )
    {
        Instance = instance;
        // ! TODO: Deprecated constructor, remove in v9
        DataMutator = null!;
        _userId = userId;
        Authentication = authentication;
        ButtonId = buttonId;
        ActionMetadata = actionMetadata ?? [];
        Language = language;
    }

    /// <summary>
    /// The instance the action is performed on
    /// </summary>
    public Instance Instance { get; }

    /// <summary>
    /// Access dataElements through this accessor to ensure that changes gets saved in storage and returned to frontend
    /// </summary>
    public IInstanceDataMutator DataMutator { get; }

    private readonly int? _userId;

    /// <summary>
    /// The user performing the action
    /// </summary>
    public int? UserId =>
        _userId
        ?? Authentication switch
        {
            Authenticated.User user => user.UserId,
            _ => null,
        };

    /// <summary>
    /// The organization number of the party the user is acting on behalf of
    /// </summary>
    public string? OnBehalfOf { get; }

    /// <summary>
    /// Information about the authenticated party
    /// </summary>
    public Authenticated? Authentication { get; }

    /// <summary>
    /// The id of the button that triggered the action (optional)
    /// </summary>
    public string? ButtonId { get; }

    /// <summary>
    /// Additional metadata for the action
    /// </summary>
    public Dictionary<string, string> ActionMetadata { get; }

    /// <summary>
    /// The language that will be used for the action
    /// </summary>
    public string? Language { get; }

    /// <summary>
    /// The cancellation token associated with the action
    /// </summary>
    public CancellationToken CancellationToken { get; }

    internal IAltinnCdnClient? AltinnCdnClient { get; set; }
}

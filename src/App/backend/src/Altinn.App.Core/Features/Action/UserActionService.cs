using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Core.Models.Validation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Action;

/// <summary>
/// Factory class for resolving <see cref="IUserAction"/> implementations
/// based on the id of the action.
/// </summary>
public class UserActionService
{
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly ITranslationService _translationService;
    private readonly ILogger<UserActionService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="UserActionService"/> class.
    /// </summary>
    /// <param name="serviceProvider">Service provider.</param>
    public UserActionService(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
        _translationService = serviceProvider.GetRequiredService<ITranslationService>();
        _logger = serviceProvider.GetRequiredService<ILogger<UserActionService>>();
    }

    /// <summary>
    /// Find the implementation of <see cref="IUserAction"/> based on the actionId
    /// </summary>
    /// <param name="actionId">The id of the action to handle.</param>
    /// <returns>The first implementation of <see cref="IUserAction"/> that matches the actionId. If no match null is returned</returns>
    public IUserAction? GetActionHandler(string? actionId)
    {
        if (actionId != null)
        {
            var handlers = _appImplementationFactory.GetAll<IUserAction>();
            return handlers.FirstOrDefault(ah => ah.Id.Equals(actionId, StringComparison.OrdinalIgnoreCase));
        }

        return null;
    }

    /// <summary>
    /// Runs <paramref name="handler"/>. A handler that throws, or that abandons its changes without failing, fails the
    /// action, and the issues of a failure are translated. Saving the changes is up to the caller.
    /// </summary>
    internal async Task<UserActionOutcome> HandleAction(
        IUserAction handler,
        InstanceDataUnitOfWork dataMutator,
        Authenticated authentication,
        string? language,
        string? buttonId,
        Dictionary<string, string>? metadata,
        string? onBehalfOf,
        CancellationToken cancellationToken
    )
    {
        var context = new UserActionContext(
            dataMutator,
            userId: null, // derived from authentication
            buttonId,
            metadata,
            language,
            authentication,
            onBehalfOf,
            cancellationToken
        );

        UserActionResult result;
        try
        {
            result = await handler.HandleAction(context);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "User action {ActionId} failed with an exception", handler.Id);
            result = UserActionResult.FailureResult(
                new ActionError { Code = "ActionFailed", Message = "The action failed" },
                errorType: ProcessErrorType.Internal
            );
        }

        if (result.ResultType is not ResultType.Failure && dataMutator.HasAbandonIssues)
        {
            result = UserActionResult.FailureResult([.. dataMutator.AbandonIssues]);
        }

        List<ValidationIssueWithSource>? validationIssues =
            result.ResultType is ResultType.Failure
                ? await _translationService.TranslateUserActionFailure(result, language)
                : null;

        return new UserActionOutcome(result, validationIssues);
    }
}

/// <summary>
/// The result of a user action, with the translated issues of a failure.
/// </summary>
internal sealed record UserActionOutcome(UserActionResult Result, List<ValidationIssueWithSource>? ValidationIssues);

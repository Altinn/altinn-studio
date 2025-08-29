
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.LayoutPageAdded;

public class LayoutPageAddedHandler(IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
    IFileSyncHandlerExecutor fileSyncHandlerExecutor) : INotificationHandler<LayoutPageAddedEvent>
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor = fileSyncHandlerExecutor;

    public async Task Handle(LayoutPageAddedEvent notification, CancellationToken cancellationToken)
    {
        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutPageAddSyncError,
            "App/config/texts/resource.nb.json",
            async () =>
            {
                AltinnAppGitRepository repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    notification.EditingContext.Org,
                    notification.EditingContext.Repo,
                    notification.EditingContext.Developer);
                if (!repository.AppUsesLayoutSets())
                {
                    return false;
                }

                TextResource jsonTexts = await repository.GetText("nb");
                int initialCount = jsonTexts.Resources.Count;
                AddTextResourceIfNotExists(jsonTexts.Resources, "next", "Neste");
                AddTextResourceIfNotExists(jsonTexts.Resources, "back", "Forrige");

                if (jsonTexts.Resources.Count != initialCount)
                {
                    await repository.SaveText("nb", jsonTexts);
                    return true;
                }
                return false;
            });
    }

    /// <summary>
    /// Adds a new TextResourceElement to the provided list if an element with the same id does not already exist.
    /// </summary>
    /// <param name="resources">The list of TextResourceElement to which the new element will be added.</param>
    /// <param name="id">The id of the TextResourceElement to be added.</param>
    /// <param name="value">The value of the TextResourceElement to be added.</param>
    private static void AddTextResourceIfNotExists(List<TextResourceElement> resources, string id, string value)
    {
        if (!resources.Any(x => x.Id == id))
        {
            resources.Add(new TextResourceElement() { Id = id, Value = value });
        }
    }
}

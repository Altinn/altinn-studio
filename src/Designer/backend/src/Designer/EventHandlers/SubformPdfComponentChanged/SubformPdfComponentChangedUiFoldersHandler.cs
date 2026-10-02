using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.SubformPdfComponentChanged;

public class SubformPdfComponentChangedUiFoldersHandler(IUiFoldersService uiFoldersService)
    : INotificationHandler<SubformPdfComponentChangedEvent>
{
    public async Task Handle(SubformPdfComponentChangedEvent notification, CancellationToken cancellationToken)
    {
        SubformPdfComponentChange change = notification.Change;
        if (change.ComponentId is not null)
        {
            await uiFoldersService.SaveSubformPdfComponent(
                notification.EditingContext,
                change.TaskId,
                change.ComponentId,
                change.SourceLayoutSetId!,
                change.PreviousComponentId,
                cancellationToken
            );
        }
        else if (change.PreviousComponentId is not null)
        {
            await uiFoldersService.DeleteSubformPdfComponent(
                notification.EditingContext,
                change.TaskId,
                change.PreviousComponentId,
                cancellationToken
            );
        }
    }
}

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/chat")]
public class ChatController(IChatService chatService) : ControllerBase
{
    [HttpGet("threads")]
    public async Task<ActionResult<List<ChatThreadEntity>>> GetThreads(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = GetEditingContext(org, app);
        return Ok(await chatService.GetThreadsAsync(editingContext, cancellationToken));
    }

    [HttpPost("threads")]
    public async Task<ActionResult<ChatThreadEntity>> CreateThread(
        string org,
        string app,
        [FromBody] CreateChatThreadRequest request,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = GetEditingContext(org, app);
        ChatThreadEntity created = await chatService.CreateThreadAsync(
            request.Title,
            editingContext,
            cancellationToken
        );
        return Created(string.Empty, created);
    }

    [HttpPut("threads/{threadId:guid}")]
    public async Task<IActionResult> UpdateThread(
        string org,
        string app,
        Guid threadId,
        [FromBody] UpdateChatThreadRequest request,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = GetEditingContext(org, app);
        await chatService.UpdateThreadAsync(threadId, request.Title, editingContext, cancellationToken);
        return NoContent();
    }

    [HttpDelete("threads/{threadId:guid}")]
    public async Task<IActionResult> DeleteThread(Guid threadId, CancellationToken cancellationToken)
    {
        await chatService.DeleteThreadAsync(threadId, cancellationToken);
        return NoContent();
    }

    [HttpGet("threads/{threadId:guid}/messages")]
    public async Task<ActionResult<List<ChatMessageEntity>>> GetMessages(
        Guid threadId,
        CancellationToken cancellationToken
    )
    {
        return Ok(await chatService.GetMessagesAsync(threadId, cancellationToken));
    }

    [HttpPost("threads/{threadId:guid}/messages")]
    public async Task<ActionResult<ChatMessageEntity>> CreateMessage(
        Guid threadId,
        [FromBody] CreateChatMessageRequest request,
        CancellationToken cancellationToken
    )
    {
        ChatMessageEntity created = await chatService.CreateMessageAsync(
            threadId,
            request.Role,
            request.Content,
            request.ActionMode,
            request.AttachmentFileNames,
            request.FilesChanged,
            cancellationToken
        );
        return Created(string.Empty, created);
    }

    private AltinnRepoEditingContext GetEditingContext(string org, string app)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        return AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
    }
}

public record CreateChatThreadRequest(string Title);

public record UpdateChatThreadRequest(string Title);

public record CreateChatMessageRequest(
    string Role,
    string Content,
    string? ActionMode,
    List<string>? AttachmentFileNames,
    List<string>? FilesChanged
);

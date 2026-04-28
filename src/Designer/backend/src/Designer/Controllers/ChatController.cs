using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
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
        List<ChatThreadEntity> threads = await chatService.GetThreadsAsync(editingContext, cancellationToken);
        return Ok(threads);
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
        return Created((string?)null, created);
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
        var updated = await chatService.UpdateThreadAsync(threadId, request, editingContext, cancellationToken);
        if (updated is null)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("threads/{threadId:guid}")]
    public async Task<IActionResult> DeleteThread(
        string org,
        string app,
        Guid threadId,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = GetEditingContext(org, app);
        await chatService.DeleteThreadAsync(threadId, editingContext, cancellationToken);
        return NoContent();
    }

    [HttpGet("threads/{threadId:guid}/messages")]
    public async Task<ActionResult<List<ChatMessageEntity>>> GetMessages(
        string org,
        string app,
        Guid threadId,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = GetEditingContext(org, app);
        List<ChatMessageEntity>? messages = await chatService.GetMessagesAsync(
            threadId,
            editingContext,
            cancellationToken
        );
        if (messages is null)
            return NotFound();

        return Ok(messages);
    }

    [HttpPost("threads/{threadId:guid}/messages")]
    [RequestSizeLimit(20_000)]
    public async Task<ActionResult<ChatMessageEntity>> CreateMessage(
        string org,
        string app,
        Guid threadId,
        [FromBody] CreateChatMessageRequest request,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = GetEditingContext(org, app);
        ChatMessageEntity? created = await chatService.CreateMessageAsync(
            threadId,
            request,
            editingContext,
            cancellationToken
        );
        if (created is null)
            return NotFound();

        return Created((string?)null, created);
    }

    [HttpDelete("threads/{threadId:guid}/messages/{messageId:guid}")]
    public async Task<IActionResult> DeleteMessage(
        string org,
        string app,
        Guid threadId,
        Guid messageId,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = GetEditingContext(org, app);
        await chatService.DeleteMessageAsync(threadId, messageId, editingContext, cancellationToken);
        return NoContent();
    }

    private AltinnRepoEditingContext GetEditingContext(string org, string app)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        return AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
    }
}

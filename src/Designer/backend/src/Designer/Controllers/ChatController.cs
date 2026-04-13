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
        try
        {
            await chatService.UpdateThreadAsync(threadId, request, editingContext, cancellationToken);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
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
        try
        {
            await chatService.DeleteThreadAsync(threadId, editingContext, cancellationToken);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
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
        try
        {
            List<ChatMessageEntity> messages = await chatService.GetMessagesAsync(
                threadId,
                editingContext,
                cancellationToken
            );
            return Ok(messages);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("threads/{threadId:guid}/messages")]
    public async Task<ActionResult<ChatMessageEntity>> CreateMessage(
        string org,
        string app,
        Guid threadId,
        [FromBody] CreateChatMessageRequest request,
        CancellationToken cancellationToken
    )
    {
        AltinnRepoEditingContext editingContext = GetEditingContext(org, app);
        try
        {
            ChatMessageEntity created = await chatService.CreateMessageAsync(
                threadId,
                request,
                editingContext,
                cancellationToken
            );
            return Created(string.Empty, created);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    private AltinnRepoEditingContext GetEditingContext(string org, string app)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        return AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
    }
}

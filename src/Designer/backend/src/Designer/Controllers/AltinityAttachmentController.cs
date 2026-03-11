using System;
using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Altinity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Accepts file uploads for the Altinity AI assistant before a workflow is started.
/// Returns an attachment ID that can be referenced in the SignalR StartWorkflow call.
/// </summary>
[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("designer/api/altinity/attachments")]
public class AltinityAttachmentController : ControllerBase
{
    private const long MaxAttachmentBytes = 20 * 1024 * 1024; // 20 MB

    private readonly AltinityAttachmentBuffer _store;

    public AltinityAttachmentController(AltinityAttachmentBuffer store)
    {
        _store = store;
    }

    /// <summary>
    /// Uploads a single attachment and returns an attachment ID.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [RequestSizeLimit(MaxAttachmentBytes)]
    public async Task<ActionResult<AttachmentUploadResponse>> Upload([FromForm] IFormFile file)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest("No file provided.");
        }

        if (file.Length > MaxAttachmentBytes)
        {
            return BadRequest($"File exceeds the {MaxAttachmentBytes / 1024 / 1024} MB limit.");
        }

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream);
        var dataBase64 = $"data:{file.ContentType};base64,{Convert.ToBase64String(memoryStream.ToArray())}";

        var attachment = new AltinityAttachmentBuffer.StoredAttachment(
            Name: file.FileName,
            MimeType: file.ContentType,
            Size: file.Length,
            DataBase64: dataBase64
        );

        var id = _store.Store(attachment);

        return Ok(new AttachmentUploadResponse(id));
    }

    public sealed record AttachmentUploadResponse(string AttachmentId);
}

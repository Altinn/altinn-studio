using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Implementation.Assistant;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Xunit;

namespace Designer.Tests.Controllers.AssistantAttachmentController;

public class UploadTests
{
    private const string Developer = "testUser";

    private readonly AssistantAttachmentBuffer _buffer = new(
        new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()))
    );

    private Altinn.Studio.Designer.Controllers.AssistantAttachmentController CreateController()
    {
        var identity = new ClaimsIdentity(new List<Claim> { new(ClaimTypes.Name, Developer) }, "TestUserLogin");
        return new(_buffer)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) },
            },
        };
    }

    private static IFormFile CreateFile(string fileName, long length = 4)
    {
        var stream = new MemoryStream([1, 2, 3, 4]);
        return new FormFile(stream, 0, length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/octet-stream",
        };
    }

    [Theory]
    [InlineData("document.pdf")]
    [InlineData("notes.md")]
    [InlineData("readme.txt")]
    [InlineData("picture.png")]
    [InlineData("picture.jpg")]
    [InlineData("picture.jpeg")]
    [InlineData("picture.gif")]
    [InlineData("picture.webp")]
    [InlineData("UPPERCASE.PDF")]
    public async Task Upload_ReturnsOk_ForAllowedExtension(string fileName)
    {
        var controller = CreateController();

        var result = await controller.Upload(CreateFile(fileName));

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response =
            Assert.IsType<Altinn.Studio.Designer.Controllers.AssistantAttachmentController.AttachmentUploadResponse>(
                okResult.Value
            );
        Assert.False(string.IsNullOrWhiteSpace(response.AttachmentId));
    }

    [Fact]
    public async Task Upload_StoresAttachmentAsDataUrlForDeveloper()
    {
        var controller = CreateController();

        var result = await controller.Upload(CreateFile("document.pdf"));

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response =
            Assert.IsType<Altinn.Studio.Designer.Controllers.AssistantAttachmentController.AttachmentUploadResponse>(
                okResult.Value
            );
        var stored = await _buffer.Get(Developer, response.AttachmentId);
        Assert.NotNull(stored);
        Assert.Equal("document.pdf", stored.Name);
        Assert.Equal("data:application/octet-stream;base64,AQIDBA==", stored.DataBase64);
    }

    [Theory]
    [InlineData("malware.exe")]
    [InlineData("archive.zip")]
    [InlineData("noextension")]
    public async Task Upload_ReturnsBadRequest_ForDisallowedExtension(string fileName)
    {
        var controller = CreateController();

        var result = await controller.Upload(CreateFile(fileName));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Upload_ReturnsBadRequest_WhenFileIsNull()
    {
        var controller = CreateController();

        var result = await controller.Upload(null);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Upload_ReturnsBadRequest_WhenFileIsEmpty()
    {
        var controller = CreateController();

        var result = await controller.Upload(CreateFile("document.pdf", length: 0));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Upload_ReturnsBadRequest_WhenFileExceedsSizeLimit()
    {
        var controller = CreateController();
        const long TwentyOneMegabytes = 21L * 1024 * 1024;

        var result = await controller.Upload(CreateFile("document.pdf", length: TwentyOneMegabytes));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}

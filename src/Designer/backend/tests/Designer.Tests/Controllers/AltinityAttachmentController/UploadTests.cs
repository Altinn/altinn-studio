using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Implementation.Altinity;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace Designer.Tests.Controllers.AltinityAttachmentController;

public class UploadTests
{
    private static Altinn.Studio.Designer.Controllers.AltinityAttachmentController CreateController() =>
        new(new AltinityAttachmentBuffer());

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
            Assert.IsType<Altinn.Studio.Designer.Controllers.AltinityAttachmentController.AttachmentUploadResponse>(
                okResult.Value
            );
        Assert.False(string.IsNullOrWhiteSpace(response.AttachmentId));
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

using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.Features.Validators.Default;

public class DefaultDataElementValidatorTests
{
    private readonly DefaultDataElementValidator _sut = new();
    private readonly Instance _instance = new() { Id = $"1234/{Guid.NewGuid()}", AppId = "ttd/test" };

    [Fact]
    public async Task ContentTypeNotAllowed_IdentifiesTheFile()
    {
        var dataType = new DataType { Id = "attachment", AllowedContentTypes = ["application/pdf", "image/png"] };
        var dataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            ContentType = "text/plain; charset=utf-8",
            Filename = "notes.txt",
        };

        var issues = await _sut.ValidateDataElement(_instance, dataElement, dataType, null);

        var issue = Assert.Single(issues);
        Assert.Equal(ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed, issue.Code);
        Assert.Equal("altinn.standard_validation.file_content_type_not_allowed", issue.CustomTextKey);
        Assert.Equal(
            new Dictionary<string, string>
            {
                ["filename"] = "notes.txt",
                ["dataType"] = "attachment",
                ["contentType"] = "text/plain",
                ["allowedContentTypes"] = "application/pdf, image/png",
            },
            issue.CustomTextParameters
        );
    }

    [Fact]
    public async Task FileTooLarge_IdentifiesTheFile()
    {
        var dataType = new DataType { Id = "attachment", MaxSize = 1 };
        var dataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            ContentType = "application/pdf",
            Filename = "big.pdf",
            Size = 2 * 1024 * 1024,
        };

        var issues = await _sut.ValidateDataElement(_instance, dataElement, dataType, null);

        var issue = Assert.Single(issues);
        Assert.Equal("backend.validation_errors.file_too_large", issue.CustomTextKey);
        Assert.Equal(
            new Dictionary<string, string>
            {
                ["filename"] = "big.pdf",
                ["dataType"] = "attachment",
                ["maxSize"] = "1",
            },
            issue.CustomTextParameters
        );
    }

    [Fact]
    public async Task FileInfected_WithoutFilename_HasEmptyFilenameParameter()
    {
        var dataType = new DataType { Id = "attachment", EnableFileScan = true };
        var dataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            ContentType = "application/pdf",
            FileScanResult = FileScanResult.Infected,
        };

        var issues = await _sut.ValidateDataElement(_instance, dataElement, dataType, null);

        var issue = Assert.Single(issues);
        Assert.Equal("backend.validation_errors.file_infected", issue.CustomTextKey);
        Assert.Equal(
            new Dictionary<string, string> { ["filename"] = "", ["dataType"] = "attachment" },
            issue.CustomTextParameters
        );
    }
}

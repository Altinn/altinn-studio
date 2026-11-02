using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Models.Validation;
using Altinn.FileAnalyzers.MimeType;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.FileAnalyzers.Tests.MimeType;

public class MimeTypeValidatorTests
{
    [Fact]
    public async Task Validate_MimeTypeCorrect_ShouldValidateOk()
    { // Simulate config in applicationMetadata.json
        var dataType = new DataType()
        {
            EnabledFileValidators = new List<string>() { "mimeTypeValidator" },
            AllowedContentTypes = new List<string>() { "application/pdf" },
        };

        // Simulate file analysis result
        IEnumerable<FileAnalysisResult> fileAnalysisResults = new List<FileAnalysisResult>()
        {
            new FileAnalysisResult("mimeTypeValidator")
            {
                MimeType = "application/pdf",
                Filename = "test.pdf",
                Extensions = new List<string>() { "pdf" },
            },
        };

        var validator = new MimeTypeValidator();
        (bool success, IEnumerable<ValidationIssue> errors) = await validator.Validate(
            dataType,
            fileAnalysisResults
        );

        Assert.True(success);
        Assert.Empty(errors);
    }

    [Fact]
    public async Task Validate_MimeTypeCorrect_ShouldReturnWithError()
    { // Simulate config in applicationMetadata.json
        var dataType = new DataType()
        {
            EnabledFileValidators = new List<string>() { "mimeTypeValidator" },
            AllowedContentTypes = new List<string>() { "application/pdf" },
        };

        // Simulate file analysis result
        IEnumerable<FileAnalysisResult> fileAnalysisResults = new List<FileAnalysisResult>()
        {
            new FileAnalysisResult("mimeTypeValidator")
            {
                MimeType = "application/pdfx",
                Filename = "test.png",
                Extensions = new List<string>() { "png" },
            },
        };

        var validator = new MimeTypeValidator();
        (bool success, IEnumerable<ValidationIssue> errors) = await validator.Validate(
            dataType,
            fileAnalysisResults
        );

        Assert.False(success);
        Assert.Equal(
            ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
            errors.FirstOrDefault()?.Code
        );
    }

    [Theory]
    // The content inspector names these types differently from the content types Studio writes
    [InlineData(
        "application/excel",
        new[] { "xls" },
        "budget.xls",
        "application/vnd.ms-excel",
        true
    )]
    [InlineData(
        "application/mspowerpoint",
        new[] { "ppt" },
        "slides.ppt",
        "application/vnd.ms-powerpoint",
        true
    )]
    [InlineData("application/xml", new[] { "xml" }, "data.xml", "text/xml", true)]
    [InlineData(
        "application/excel",
        new[] { "xls" },
        "BUDGET.XLS",
        "application/vnd.ms-excel",
        true
    )]
    // The content is not what the extension says
    [InlineData("image/webp", new[] { "webp" }, "photo.jpg", "image/jpeg", false)]
    // The extension's content type is not allowed
    [InlineData("application/excel", new[] { "xls" }, "budget.xls", "application/pdf", false)]
    // No filename, or content the inspector does not recognize
    [InlineData("application/excel", new[] { "xls" }, null, "application/vnd.ms-excel", false)]
    [InlineData(null, new string[0], "document.pdf", "application/pdf", false)]
    public async Task Validate_ChecksContentTypeOfFileExtension_OnlyWhenContentMatchesIt(
        string? mimeType,
        string[] extensions,
        string? filename,
        string allowedContentType,
        bool expectedSuccess
    )
    {
        var dataType = new DataType()
        {
            Id = "attachment",
            EnabledFileValidators = new List<string>() { "mimeTypeValidator" },
            AllowedContentTypes = new List<string>() { allowedContentType },
        };
        IEnumerable<FileAnalysisResult> fileAnalysisResults = new List<FileAnalysisResult>()
        {
            new FileAnalysisResult("mimeTypeAnalyser")
            {
                MimeType = mimeType,
                Filename = filename,
                Extensions = extensions.ToList(),
            },
        };

        var validator = new MimeTypeValidator();
        (bool success, _) = await validator.Validate(dataType, fileAnalysisResults);

        Assert.Equal(expectedSuccess, success);
    }

    [Fact]
    public async Task Validate_ContentTypeNotAllowed_SetsTextKeyAndParameters()
    {
        var dataType = new DataType()
        {
            Id = "attachment",
            EnabledFileValidators = new List<string>() { "mimeTypeValidator" },
            AllowedContentTypes = new List<string>() { "application/pdf", "image/png" },
        };
        IEnumerable<FileAnalysisResult> fileAnalysisResults = new List<FileAnalysisResult>()
        {
            new FileAnalysisResult("mimeTypeValidator")
            {
                MimeType = "text/plain",
                Filename = "notes.txt",
            },
        };

        var validator = new MimeTypeValidator();
        (_, IEnumerable<ValidationIssue> errors) = await validator.Validate(
            dataType,
            fileAnalysisResults
        );

        var issue = Assert.Single(errors);
        Assert.Null(issue.Description);
        Assert.Equal("validation_errors.file_content_type_not_allowed", issue.CustomTextKey);
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
}

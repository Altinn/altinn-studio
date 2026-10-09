using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Internal.Files;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Files;

public class FileServiceTests
{
    [Fact]
    public async Task RunFileAnalysisAndValidation_NoAnalysersOrValidators_ReturnsNull()
    {
        // Arrange
        var fileAnalysisService = new Mock<IFileAnalysisService>();
        var fileValidationService = new Mock<IFileValidationService>();
        var fileService = new FileService(
            fileAnalysisService.Object,
            fileValidationService.Object,
            Mock.Of<ITranslationService>()
        );

        var dataType = new DataType
        {
            Id = "test-datatype",
            EnabledFileAnalysers = null,
            EnabledFileValidators = null,
        };
        var bytes = new byte[] { 1, 2, 3 };
        var filename = "test.txt";

        // Act
        var result = await fileService.RunFileAnalysisAndValidation(dataType, bytes, filename, language: null);

        // Assert
        result.Should().BeNull();
        fileAnalysisService.Verify(
            x => x.Analyze(It.IsAny<DataType>(), It.IsAny<Stream>(), It.IsAny<string>()),
            Times.Never
        );
        fileValidationService.Verify(
            x => x.Validate(It.IsAny<DataType>(), It.IsAny<List<FileAnalysisResult>>()),
            Times.Never
        );
    }

    [Fact]
    public async Task RunFileAnalysisAndValidation_WithAnalysersOnly_ValidationSucceeds_ReturnsNull()
    {
        // Arrange
        var fileAnalysisService = new Mock<IFileAnalysisService>();
        var fileValidationService = new Mock<IFileValidationService>();
        var fileService = new FileService(
            fileAnalysisService.Object,
            fileValidationService.Object,
            Mock.Of<ITranslationService>()
        );

        var dataType = new DataType
        {
            Id = "test-datatype",
            EnabledFileAnalysers = new List<string> { "analyzer1" },
            EnabledFileValidators = null,
        };
        var bytes = new byte[] { 1, 2, 3 };
        var filename = "test.txt";

        var analysisResults = new List<FileAnalysisResult> { new("analyzer1") { Filename = filename } };

        fileAnalysisService.Setup(x => x.Analyze(dataType, It.IsAny<Stream>(), filename)).ReturnsAsync(analysisResults);

        // Act
        var result = await fileService.RunFileAnalysisAndValidation(dataType, bytes, filename, language: null);

        // Assert
        result.Should().BeNull();
        fileAnalysisService.Verify(x => x.Analyze(dataType, It.IsAny<Stream>(), filename), Times.Once);
        fileValidationService.Verify(
            x => x.Validate(It.IsAny<DataType>(), It.IsAny<List<FileAnalysisResult>>()),
            Times.Never
        );
    }

    [Fact]
    public async Task RunFileAnalysisAndValidation_WithValidatorsOnly_ValidationSucceeds_ReturnsNull()
    {
        // Arrange
        var fileAnalysisService = new Mock<IFileAnalysisService>();
        var fileValidationService = new Mock<IFileValidationService>();
        var fileService = new FileService(
            fileAnalysisService.Object,
            fileValidationService.Object,
            Mock.Of<ITranslationService>()
        );

        var dataType = new DataType
        {
            Id = "test-datatype",
            EnabledFileAnalysers = null,
            EnabledFileValidators = new List<string> { "validator1" },
        };
        var bytes = new byte[] { 1, 2, 3 };
        var filename = "test.txt";

        fileValidationService
            .Setup(x => x.Validate(dataType, It.IsAny<List<FileAnalysisResult>>()))
            .ReturnsAsync((true, new List<ValidationIssueWithSource>()));

        // Act
        var result = await fileService.RunFileAnalysisAndValidation(dataType, bytes, filename, language: null);

        // Assert
        result.Should().BeNull();
        fileAnalysisService.Verify(
            x => x.Analyze(It.IsAny<DataType>(), It.IsAny<Stream>(), It.IsAny<string>()),
            Times.Never
        );
        fileValidationService.Verify(x => x.Validate(dataType, It.IsAny<List<FileAnalysisResult>>()), Times.Once);
    }

    [Fact]
    public async Task RunFileAnalysisAndValidation_WithAnalysersAndValidators_ValidationSucceeds_ReturnsNull()
    {
        // Arrange
        var fileAnalysisService = new Mock<IFileAnalysisService>();
        var fileValidationService = new Mock<IFileValidationService>();
        var fileService = new FileService(
            fileAnalysisService.Object,
            fileValidationService.Object,
            Mock.Of<ITranslationService>()
        );

        var dataType = new DataType
        {
            Id = "test-datatype",
            EnabledFileAnalysers = new List<string> { "analyzer1" },
            EnabledFileValidators = new List<string> { "validator1" },
        };
        var bytes = new byte[] { 1, 2, 3 };
        var filename = "test.txt";

        var analysisResults = new List<FileAnalysisResult>
        {
            new("analyzer1") { Filename = filename, MimeType = "text/plain" },
        };

        fileAnalysisService.Setup(x => x.Analyze(dataType, It.IsAny<Stream>(), filename)).ReturnsAsync(analysisResults);

        fileValidationService
            .Setup(x => x.Validate(dataType, It.Is<List<FileAnalysisResult>>(list => list.Count == 1)))
            .ReturnsAsync((true, new List<ValidationIssueWithSource>()));

        // Act
        var result = await fileService.RunFileAnalysisAndValidation(dataType, bytes, filename, language: null);

        // Assert
        result.Should().BeNull();
        fileAnalysisService.Verify(x => x.Analyze(dataType, It.IsAny<Stream>(), filename), Times.Once);
        fileValidationService.Verify(
            x => x.Validate(dataType, It.Is<List<FileAnalysisResult>>(list => list.Count == 1)),
            Times.Once
        );
    }

    [Fact]
    public async Task RunFileAnalysisAndValidation_ValidationFails_ReturnsValidationIssues()
    {
        // Arrange
        var fileAnalysisService = new Mock<IFileAnalysisService>();
        var fileValidationService = new Mock<IFileValidationService>();
        var fileService = new FileService(
            fileAnalysisService.Object,
            fileValidationService.Object,
            Mock.Of<ITranslationService>()
        );

        var dataType = new DataType
        {
            Id = "test-datatype",
            EnabledFileAnalysers = new List<string> { "analyzer1" },
            EnabledFileValidators = new List<string> { "validator1" },
        };
        var bytes = new byte[] { 1, 2, 3 };
        var filename = "malicious.exe";

        var analysisResults = new List<FileAnalysisResult>
        {
            new("analyzer1") { Filename = filename, MimeType = "application/x-msdownload" },
        };

        var validationIssues = new List<ValidationIssueWithSource>
        {
            new()
            {
                Code = ValidationIssueCodes.DataElementCodes.InvalidFileNameFormat,
                Severity = ValidationIssueSeverity.Error,
                Description = "Invalid filename extension",
                Source = ValidationIssueSources.File,
            },
        };

        fileAnalysisService.Setup(x => x.Analyze(dataType, It.IsAny<Stream>(), filename)).ReturnsAsync(analysisResults);

        fileValidationService
            .Setup(x => x.Validate(dataType, It.IsAny<List<FileAnalysisResult>>()))
            .ReturnsAsync((false, validationIssues));

        // Act
        var result = await fileService.RunFileAnalysisAndValidation(dataType, bytes, filename, language: null);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(1);
        result[0].Code.Should().Be(ValidationIssueCodes.DataElementCodes.InvalidFileNameFormat);
        result[0].Severity.Should().Be(ValidationIssueSeverity.Error);
        result[0].Description.Should().Be("Invalid filename extension");
        result[0].Source.Should().Be(ValidationIssueSources.File);
    }

    [Fact]
    public async Task RunFileAnalysisAndValidation_MultipleValidationIssues_ReturnsAllIssues()
    {
        // Arrange
        var fileAnalysisService = new Mock<IFileAnalysisService>();
        var fileValidationService = new Mock<IFileValidationService>();
        var fileService = new FileService(
            fileAnalysisService.Object,
            fileValidationService.Object,
            Mock.Of<ITranslationService>()
        );

        var dataType = new DataType
        {
            Id = "test-datatype",
            EnabledFileAnalysers = new List<string> { "analyzer1" },
            EnabledFileValidators = new List<string> { "validator1", "validator2" },
        };
        var bytes = new byte[] { 1, 2, 3 };
        var filename = "bad-file.txt";

        var analysisResults = new List<FileAnalysisResult> { new("analyzer1") { Filename = filename } };

        var validationIssues = new List<ValidationIssueWithSource>
        {
            new()
            {
                Code = ValidationIssueCodes.DataElementCodes.InvalidFileNameFormat,
                Severity = ValidationIssueSeverity.Error,
                Description = "Invalid filename",
                Source = ValidationIssueSources.File,
            },
            new()
            {
                Code = ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
                Severity = ValidationIssueSeverity.Error,
                Description = "Content type not allowed",
                Source = ValidationIssueSources.File,
            },
        };

        fileAnalysisService.Setup(x => x.Analyze(dataType, It.IsAny<Stream>(), filename)).ReturnsAsync(analysisResults);

        fileValidationService
            .Setup(x => x.Validate(dataType, It.IsAny<List<FileAnalysisResult>>()))
            .ReturnsAsync((false, validationIssues));

        // Act
        var result = await fileService.RunFileAnalysisAndValidation(dataType, bytes, filename, language: null);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        result[0].Code.Should().Be(ValidationIssueCodes.DataElementCodes.InvalidFileNameFormat);
        result[1].Code.Should().Be(ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed);
    }

    [Fact]
    public async Task RunFileAnalysisAndValidation_NullFilename_StillRunsAnalysisAndValidation()
    {
        // Arrange
        var fileAnalysisService = new Mock<IFileAnalysisService>();
        var fileValidationService = new Mock<IFileValidationService>();
        var fileService = new FileService(
            fileAnalysisService.Object,
            fileValidationService.Object,
            Mock.Of<ITranslationService>()
        );

        var dataType = new DataType
        {
            Id = "test-datatype",
            EnabledFileAnalysers = new List<string> { "analyzer1" },
            EnabledFileValidators = new List<string> { "validator1" },
        };
        var bytes = new byte[] { 1, 2, 3 };
        string? filename = null;

        var analysisResults = new List<FileAnalysisResult>
        {
            new("analyzer1") { MimeType = "application/octet-stream" },
        };

        fileAnalysisService.Setup(x => x.Analyze(dataType, It.IsAny<Stream>(), null)).ReturnsAsync(analysisResults);

        fileValidationService
            .Setup(x => x.Validate(dataType, It.IsAny<List<FileAnalysisResult>>()))
            .ReturnsAsync((true, new List<ValidationIssueWithSource>()));

        // Act
        var result = await fileService.RunFileAnalysisAndValidation(dataType, bytes, filename, language: null);

        // Assert
        result.Should().BeNull();
        fileAnalysisService.Verify(x => x.Analyze(dataType, It.IsAny<Stream>(), null), Times.Once);
        fileValidationService.Verify(x => x.Validate(dataType, It.IsAny<List<FileAnalysisResult>>()), Times.Once);
    }

    [Fact]
    public async Task RunFileAnalysisAndValidation_ValidationFails_TranslatesIssuesWithOnlyATextKey()
    {
        // Arrange
        var fileAnalysisService = new Mock<IFileAnalysisService>();
        var fileValidationService = new Mock<IFileValidationService>();
        var translationService = new Mock<ITranslationService>();
        var fileService = new FileService(
            fileAnalysisService.Object,
            fileValidationService.Object,
            translationService.Object
        );

        var dataType = new DataType
        {
            Id = "test-datatype",
            EnabledFileAnalysers = new List<string> { "analyzer1" },
            EnabledFileValidators = new List<string> { "validator1" },
        };
        var bytes = new byte[] { 1, 2, 3 };
        var filename = "malicious.exe";

        var validationIssues = new List<ValidationIssueWithSource>
        {
            new()
            {
                Code = ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
                Severity = ValidationIssueSeverity.Error,
                Description = null,
                CustomTextKey = "altinn.standard_validation.file_content_type_not_allowed",
                Source = ValidationIssueSources.File,
            },
            new()
            {
                Code = ValidationIssueCodes.DataElementCodes.InvalidFileNameFormat,
                Severity = ValidationIssueSeverity.Error,
                Description = "Invalid filename extension",
                CustomTextKey = "custom.key",
                Source = ValidationIssueSources.File,
            },
        };

        fileAnalysisService
            .Setup(x => x.Analyze(dataType, It.IsAny<Stream>(), filename))
            .ReturnsAsync(new List<FileAnalysisResult>());
        fileValidationService
            .Setup(x => x.Validate(dataType, It.IsAny<List<FileAnalysisResult>>()))
            .ReturnsAsync((false, validationIssues));
        translationService
            .Setup(x => x.TranslateTextKey("altinn.standard_validation.file_content_type_not_allowed", "nn", null))
            .ReturnsAsync("Filtypen er ikkje tillaten");

        // Act
        var result = await fileService.RunFileAnalysisAndValidation(dataType, bytes, filename, language: "nn");

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        result[0].Description.Should().Be("Filtypen er ikkje tillaten");
        result[1].Description.Should().Be("Invalid filename extension");
        translationService.Verify(
            x => x.TranslateTextKey("custom.key", It.IsAny<string?>(), It.IsAny<Dictionary<string, string>?>()),
            Times.Never
        );
    }
}

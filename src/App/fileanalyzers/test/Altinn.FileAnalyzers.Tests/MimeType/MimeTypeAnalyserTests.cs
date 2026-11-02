using Altinn.App.Core.Features.FileAnalysis;
using Altinn.FileAnalyzers.MimeType;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using MimeDetective;
using Moq;

namespace Altinn.FileAnalyzers.Tests.MimeType;

public class MimeTypeAnalyzerTests
{
    private readonly IContentInspector _contentInspector;

    public MimeTypeAnalyzerTests()
    {
        IServiceCollection services = new ServiceCollection();
        services.AddMimeTypeValidation();
        var serviceProvider = services.BuildServiceProvider();
        _contentInspector = serviceProvider.GetRequiredService<IContentInspector>();
    }

    [Fact]
    public async Task Analyse_ValidPdf_ShouldReturnCorrectMimeType()
    {
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        var mimeTypeAnalyser = new MimeTypeAnalyzer(
            httpContextAccessorMock.Object,
            _contentInspector
        );
        var stream = EmbeddedResource.LoadDataAsStream(
            "Altinn.FileAnalyzers.Tests.MimeType.example.pdf"
        );

        FileAnalysisResult analysisResult = await mimeTypeAnalyser.Analyze(stream);

        Assert.Equal("application/pdf", analysisResult.MimeType);
    }

    [Fact]
    public async Task Analyse_InvalidPdf_ShouldReturnCorrectMimeType()
    {
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        var mimeTypeAnalyser = new MimeTypeAnalyzer(
            httpContextAccessorMock.Object,
            _contentInspector
        );
        var stream = EmbeddedResource.LoadDataAsStream(
            "Altinn.FileAnalyzers.Tests.MimeType.example.jpg.pdf"
        );

        FileAnalysisResult analysisResult = await mimeTypeAnalyser.Analyze(stream);

        Assert.Equal("image/jpeg", analysisResult.MimeType);
    }

    [Fact]
    public async Task Analyse_ValidXls_ShouldPassValidatorThatAllowsVndMsExcel()
    {
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        var mimeTypeAnalyser = new MimeTypeAnalyzer(
            httpContextAccessorMock.Object,
            _contentInspector
        );
        var stream = EmbeddedResource.LoadDataAsStream(
            "Altinn.FileAnalyzers.Tests.MimeType.example.xls"
        );
        var dataType = new DataType()
        {
            Id = "attachment",
            AllowedContentTypes = new List<string>() { "application/vnd.ms-excel" },
        };

        FileAnalysisResult analysisResult = await mimeTypeAnalyser.Analyze(stream, "example.xls");
        (bool success, _) = await new MimeTypeValidator().Validate(
            dataType,
            new List<FileAnalysisResult>() { analysisResult }
        );

        Assert.Equal("application/excel", analysisResult.MimeType);
        Assert.True(success);
    }
}

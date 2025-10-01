using Altinn.App.Core.Features.FileAnalysis;
using Altinn.FileAnalyzers.MimeType;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using MimeDetective;
using Moq;

namespace Altinn.FileAnalyzers.Tests.MimeType;

public class MimeTypeAnalyserTests
{
    private readonly IContentInspector _contentInspector;

    public MimeTypeAnalyserTests()
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
        var mimeTypeAnalyser = new MimeTypeAnalyser(
            httpContextAccessorMock.Object,
            _contentInspector
        );
        var stream = EmbeddedResource.LoadDataAsStream(
            "Altinn.FileAnalyzers.Tests.MimeType.example.pdf"
        );

        FileAnalysisResult analysisResult = await mimeTypeAnalyser.Analyse(stream);

        Assert.Equal("application/pdf", analysisResult.MimeType);
    }

    [Fact]
    public async Task Analyse_InvalidPdf_ShouldReturnCorrectMimeType()
    {
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        var mimeTypeAnalyser = new MimeTypeAnalyser(
            httpContextAccessorMock.Object,
            _contentInspector
        );
        var stream = EmbeddedResource.LoadDataAsStream(
            "Altinn.FileAnalyzers.Tests.MimeType.example.jpg.pdf"
        );

        FileAnalysisResult analysisResult = await mimeTypeAnalyser.Analyse(stream);

        Assert.Equal("image/jpeg", analysisResult.MimeType);
    }
}

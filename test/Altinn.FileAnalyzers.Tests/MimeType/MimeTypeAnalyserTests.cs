using Altinn.App.Core.Features.FileAnalysis;
using Altinn.Codelists.Tests;
using Altinn.FileAnalyzers.MimeType;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;

namespace Altinn.FileAnalyzers.Tests.MimeType
{
    public class MimeTypeAnalyserTests
    {
        [Fact]
        public async Task Analyse_ValidPdf_ShouldReturnCorrectMimeType()
        {
            var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            MimeTypeAnalyser mimeTypeAnalyser = new MimeTypeAnalyser(httpContextAccessorMock.Object);
            var stream = EmbeddedResource.LoadDataAsStream("Altinn.FileAnalyzers.Tests.MimeType.example.pdf");

            FileAnalysisResult analysisResult = await mimeTypeAnalyser.Analyse(stream);

            analysisResult.MimeType.Should().Be("application/pdf");
        }

        // Test that the analyser fails on a file that is not a PDF but a jpg
        [Fact]
        public async Task Analyse_InvalidPdf_ShouldReturnCorrectMimeType()
        {
            var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            MimeTypeAnalyser mimeTypeAnalyser = new MimeTypeAnalyser(httpContextAccessorMock.Object);
            var stream = EmbeddedResource.LoadDataAsStream("Altinn.FileAnalyzers.Tests.MimeType.example.jpg.pdf");
            FileAnalysisResult analysisResult = await mimeTypeAnalyser.Analyse(stream);
            analysisResult.MimeType.Should().Be("image/jpeg");
        }



    }
}

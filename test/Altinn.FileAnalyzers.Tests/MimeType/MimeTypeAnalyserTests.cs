using Altinn.App.Core.Features.FileAnalysis;
using Altinn.FileAnalyzers.MimeType;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using MimeDetective;
using Moq;

namespace Altinn.FileAnalyzers.Tests.MimeType
{
    public class MimeTypeAnalyserTests
    {
        private readonly ContentInspector? _contentInspector;

        public MimeTypeAnalyserTests()
        {
            IServiceCollection services = new ServiceCollection();
            services.AddMimeTypeValidation();
            var serviceProvider = services.BuildServiceProvider();
            _contentInspector = serviceProvider.GetService<ContentInspector>();

            if(_contentInspector == null)
            {
                throw new System.Exception("Could not get ContentInspector from service provider");
            }

        }

        [Fact]
        public async Task Analyse_ValidPdf_ShouldReturnCorrectMimeType()
        {
            var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            var mimeTypeAnalyser = new MimeTypeAnalyser(httpContextAccessorMock.Object, _contentInspector!);
            var stream = EmbeddedResource.LoadDataAsStream("Altinn.FileAnalyzers.Tests.MimeType.example.pdf");

            FileAnalysisResult analysisResult = await mimeTypeAnalyser.Analyse(stream);

            analysisResult.MimeType.Should().Be("application/pdf");
        }

        [Fact]
        public async Task Analyse_InvalidPdf_ShouldReturnCorrectMimeType()
        {
            var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            var mimeTypeAnalyser = new MimeTypeAnalyser(httpContextAccessorMock.Object, _contentInspector!);
            var stream = EmbeddedResource.LoadDataAsStream("Altinn.FileAnalyzers.Tests.MimeType.example.jpg.pdf");
            
            FileAnalysisResult analysisResult = await mimeTypeAnalyser.Analyse(stream);
            
            analysisResult.MimeType.Should().Be("image/jpeg");
        }
    }
}

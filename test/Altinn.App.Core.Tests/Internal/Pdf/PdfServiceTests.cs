#nullable enable

using System.Net;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Infrastructure.Clients.Pdf;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.PlatformServices.Tests.Helpers;
using Altinn.App.PlatformServices.Tests.Mocks;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Internal.Pdf
{
    public class PdfServiceTests
    {
        private const string HostName = "at22.altinn.cloud";

        private readonly Mock<IPDF> _pdf = new();
        private readonly Mock<IAppResources> _appResources = new();
        private readonly Mock<IPdfOptionsMapping> _pdfOptionsMapping = new();
        private readonly Mock<IData> _dataClient = new();
        private readonly Mock<IHttpContextAccessor> _httpContextAccessor = new();
        private readonly Mock<IPdfGeneratorClient> _pdfGeneratorClient = new();
        private readonly Mock<IProfile> _profile = new();
        private readonly Mock<IRegister> _register = new();
        private readonly Mock<IPdfFormatter> pdfFormatter = new();
        private readonly IOptions<PdfGeneratorSettings> _pdfGeneratorSettingsOptions = Microsoft.Extensions.Options.Options.Create<PdfGeneratorSettings>(new() { });

        private readonly IOptions<GeneralSettings> _generalSettingsOptions = Microsoft.Extensions.Options.Options.Create<GeneralSettings>(new()
        {
            HostName = HostName
        });

        private readonly IOptions<PlatformSettings> _platformSettingsOptions = Microsoft.Extensions.Options.Options.Create<PlatformSettings>(new() { });

        private readonly Mock<IUserTokenProvider> _userTokenProvider;

        public PdfServiceTests()
        {
            var resource = new TextResource() { Id = "digdir-not-really-an-app-nb", Language = "nb", Org = "digdir", Resources = new List<TextResourceElement>() };
            _appResources.Setup(s => s.GetTexts(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(resource);

            DefaultHttpContext httpContext = new();
            httpContext.Request.Protocol = "https";
            httpContext.Request.Host = new(HostName);
            _httpContextAccessor.Setup(s => s.HttpContext!).Returns(httpContext);

            _userTokenProvider = new Mock<IUserTokenProvider>();
            _userTokenProvider.Setup(s => s.GetUserToken()).Returns("usertoken");
        }

        [Fact]
        public async Task ValidRequest_ShouldReturnPdf()
        {
            DelegatingHandlerStub delegatingHandler = new(async (HttpRequestMessage request, CancellationToken token) =>
            {
                await Task.CompletedTask;
                return new HttpResponseMessage() { Content = new StreamContent(EmbeddedResource.LoadDataAsStream("Altinn.App.Core.Tests.Internal.Pdf.TestData.example.pdf")) };
            });

            var httpClient = new HttpClient(delegatingHandler);
            var pdfGeneratorClient = new PdfGeneratorClient(httpClient, _pdfGeneratorSettingsOptions, _platformSettingsOptions, _userTokenProvider.Object);

            Stream pdf = await pdfGeneratorClient.GeneratePdf(new Uri(@"https://org.apps.hostName/appId/#/instance/instanceId"), CancellationToken.None);

            pdf.Length.Should().Be(17814L);
        }

        [Fact]
        public async Task ValidRequest_PdfGenerationFails_ShouldThrowException()
        {
            DelegatingHandlerStub delegatingHandler = new(async (HttpRequestMessage request, CancellationToken token) =>
            {
                await Task.CompletedTask;
                return new HttpResponseMessage() { StatusCode = HttpStatusCode.RequestTimeout };
            });

            var httpClient = new HttpClient(delegatingHandler);
            var pdfGeneratorClient = new PdfGeneratorClient(httpClient, _pdfGeneratorSettingsOptions, _platformSettingsOptions, _userTokenProvider.Object);

            var func = async () => await pdfGeneratorClient.GeneratePdf(new Uri(@"https://org.apps.hostName/appId/#/instance/instanceId"), CancellationToken.None);

            await func.Should().ThrowAsync<PdfGenerationException>();
        }

        [Fact]
        public async Task GenerateAndStorePdf()
        {
            // Arrange
            _pdfGeneratorClient.Setup(s => s.GeneratePdf(It.IsAny<Uri>(), It.IsAny<CancellationToken>()));
            _generalSettingsOptions.Value.ExternalAppBaseUrl = "https://{org}.apps.{hostName}/{org}/{app}";

            var target = new PdfService(
                _pdf.Object,
                _appResources.Object,
                _pdfOptionsMapping.Object,
                _dataClient.Object,
                _httpContextAccessor.Object,
                _profile.Object,
                _register.Object,
                pdfFormatter.Object,
                _pdfGeneratorClient.Object,
                _pdfGeneratorSettingsOptions,
                _generalSettingsOptions);

            Instance instance = new()
            {
                Id = $"509378/{Guid.NewGuid()}",
                AppId = "digdir/not-really-an-app",
                Org = "digdir"
            };

            // Act
            await target.GenerateAndStorePdf(instance, CancellationToken.None);

            // Asserts
            _pdfGeneratorClient.Verify(
                s => s.GeneratePdf(
                    It.Is<Uri>(
                        u => u.Scheme == "https" &&
                        u.Host == $"{instance.Org}.apps.{HostName}" &&
                        u.AbsoluteUri.Contains(instance.AppId) &&
                        u.AbsoluteUri.Contains(instance.Id)),
                    It.IsAny<CancellationToken>()),
                Times.Once);

            _dataClient.Verify(
                s => s.InsertBinaryData(
                    It.Is<string>(s => s == instance.Id),
                    It.Is<string>(s => s == "ref-data-as-pdf"),
                    It.Is<string>(s => s == "application/pdf"),
                    It.Is<string>(s => s == "not-really-an-app.pdf"),
                    It.IsAny<Stream>()),
                Times.Once);
        }
    }
}

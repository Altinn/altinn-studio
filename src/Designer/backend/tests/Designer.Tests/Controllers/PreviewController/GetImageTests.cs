using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class GetImageTests : PreviewControllerTestsBase<GetImageTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public GetImageTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_Image_From_Wwww_Root_Folder_Ok()
        {
            byte[] expectedImageData = TestDataHelper.GetFileAsByteArrayFromRepo(Org, PreviewApp, Developer, "App/wwwroot/AltinnD-logo.svg");

            string dataPathWithData = $"{Org}/{PreviewApp}/AltinnD-logo.svg";

            using HttpResponseMessage response = await HttpClient.GetAsync(dataPathWithData);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var result = await response.Content.ReadAsByteArrayAsync();
            Assert.NotNull(result);
            Assert.Equal(expectedImageData, result);
        }

        [Fact]
        public async Task Get_Image_From_Sub_Folder_Ok()
        {
            byte[] expectedImageData = TestDataHelper.GetFileAsByteArrayFromRepo(Org, PreviewApp, Developer, "App/wwwroot/images/AltinnD-logo.svg");

            string dataPathWithData = $"{Org}/{PreviewApp}/images/AltinnD-logo.svg";

            using HttpResponseMessage response = await HttpClient.GetAsync(dataPathWithData);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var result = await response.Content.ReadAsByteArrayAsync();
            Assert.NotNull(result);
            Assert.Equal(expectedImageData, result);
        }

        [Fact]
        public async Task Get_Image_From_Sub_Sub_Folder_Ok()
        {
            byte[] expectedImageData = TestDataHelper.GetFileAsByteArrayFromRepo(Org, PreviewApp, Developer, "App/wwwroot/images/subImagesFolder/AltinnD-logo.svg");

            string dataPathWithData = $"{Org}/{PreviewApp}/images/subImagesFolder/AltinnD-logo.svg";

            using HttpResponseMessage response = await HttpClient.GetAsync(dataPathWithData);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            byte[] result = await response.Content.ReadAsByteArrayAsync();
            Assert.NotNull(result);
            Assert.Equal(expectedImageData, result);
        }

        [Fact]
        public async Task Get_Image_Non_Existing_Folder_Returns_NotFound()
        {
            string dataPathWithData = $"{Org}/{AppV3Path}/images/subImagesFolder/SubSubImageFolder/AltinnD-logo.svg";

            using HttpResponseMessage response = await HttpClient.GetAsync(dataPathWithData);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task Get_Image_Non_Existing_Image_Return_NotFound()
        {
            string dataPathWithData = $"{Org}/{AppV3Path}/images/subImagesFolder/non-existing-image.svg";

            using HttpResponseMessage response = await HttpClient.GetAsync(dataPathWithData);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task Call_To_Get_Designer_Iframe_Does_Not_Hit_Image_EndPoint()
        {
            Mock<IAltinnGitRepositoryFactory> factMock = new();
            ConfigureTestServicesForSpecificTest = s =>
            {
                s.AddTransient(_ => factMock.Object);
            };

            string dataPathWithData = "designer/html/path/some-file.jpg";
            using HttpResponseMessage response = await HttpClient.GetAsync(dataPathWithData);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            factMock.Verify(x => x.GetAltinnAppGitRepository(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }
    }
}

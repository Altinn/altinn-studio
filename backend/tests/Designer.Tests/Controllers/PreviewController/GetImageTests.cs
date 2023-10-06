using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class GetImageTests : PreviewControllerTestsBase<GetImageTests>
    {

        public GetImageTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.PreviewController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_Image_From_Wwww_Root_Folder_Ok()
        {
            byte[] expectedImagemData = TestDataHelper.GetFileAsByteArrayFromRepo(Org, App, Developer, "App/wwwroot/AltinnD-logo.svg");

            string dataPathWithData = $"{Org}/{App}/AltinnD-logo.svg";

            using HttpResponseMessage response = await HttpClient.Value.GetAsync(dataPathWithData);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var result = await response.Content.ReadAsByteArrayAsync();
            Assert.NotNull(result);
            Assert.Equal(expectedImagemData, result);
        }

        [Fact]
        public async Task Get_Image_From_Sub_Folder_Ok()
        {
            byte[] expectedImagemData = TestDataHelper.GetFileAsByteArrayFromRepo(Org, App, Developer, "App/wwwroot/images/AltinnD-logo.svg");

            string dataPathWithData = $"{Org}/{App}/images/AltinnD-logo.svg";

            using HttpResponseMessage response = await HttpClient.Value.GetAsync(dataPathWithData);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var result = await response.Content.ReadAsByteArrayAsync();
            Assert.NotNull(result);
            Assert.Equal(expectedImagemData, result);
        }

        [Fact]
        public async Task Get_Image_From_Sub_Sub_Folder_Ok()
        {
            byte[] expectedImagemData = TestDataHelper.GetFileAsByteArrayFromRepo(Org, App, Developer, "App/wwwroot/images/subImagesFolder/AltinnD-logo.svg");

            string dataPathWithData = $"{Org}/{App}/images/subImagesFolder/AltinnD-logo.svg";

            using HttpResponseMessage response = await HttpClient.Value.GetAsync(dataPathWithData);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var result = await response.Content.ReadAsByteArrayAsync();
            Assert.NotNull(result);
            Assert.Equal(expectedImagemData, result);
        }
    }
}

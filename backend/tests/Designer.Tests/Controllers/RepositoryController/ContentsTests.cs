using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.RepositoryController
{
    public class ContentsTests : RepositoryControllerTestsBase<ContentsTests>
    {
        public ContentsTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.RepositoryController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Contents_ContentsReturned_OK()
        {
            // Arrange
            string uri = $"{VersionPrefix}/repo/ttd/apps-test/contents";

            RepositoryMock
                .Setup(r => r.GetContents(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns(new List<FileSystemObject>
                {
                    new FileSystemObject
                    {
                        Name = "appsettings.Development.json",
                        Encoding = "Unicode (UTF-8)",
                        Path = "App/appsettings.Development.json",
                        Type = "File"
                    }
                });

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task Contents_ContentsIsNull_BadRequest()
        {
            // Arrange
            string uri = $"{VersionPrefix}/repo/acn-sbuad/apps-test/contents?path=App";

            RepositoryMock
                .Setup(r => r.GetContents(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns((List<FileSystemObject>)null);

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        }

    }
}

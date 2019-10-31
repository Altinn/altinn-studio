using System.Net;
using System.Net.Http;
using AltinnCore.Common.Services.Implementation;
using Xunit;

namespace AltinnCore.UnitTest.Runtime
{
    /// <summary>
    /// Tests the platformclient exception class.
    /// </summary>
    public class PlatformClientExceptionTest
    {
        /// <summary>
        /// Instantiate and format
        /// </summary>
        [Fact]
        public void PlatformClientExceptionWithMessageOk()
        {
            PlatformClientException exception = new PlatformClientException("Something is wrong");

            Assert.Equal("Something is wrong", exception.Message);
        }

        /// <summary>
        /// Instantiate and format the BadRequest message.
        /// </summary>
        [Fact]
        public void PlatformClientFormatBadRequestOk()
        {
            HttpResponseMessage response = new HttpResponseMessage(HttpStatusCode.BadRequest)
            {
                Content = new StringContent("content explanation"),
            };

            PlatformClientException exception = new PlatformClientException(response);

            Assert.Equal("400 - Bad Request - content explanation", exception.Message);
        }

        /// <summary>
        /// Instantiate and format the BadRequest message.
        /// </summary>
        [Fact]
        public void PlatformClientFormat500Ok()
        {
            HttpResponseMessage response = new HttpResponseMessage(HttpStatusCode.InternalServerError)
            {
                Content = new StringContent("my error text"),
            };

            PlatformClientException exception = new PlatformClientException(response);

            Assert.Equal("500 - Internal Server Error - my error text", exception.Message);
        }
    }
}

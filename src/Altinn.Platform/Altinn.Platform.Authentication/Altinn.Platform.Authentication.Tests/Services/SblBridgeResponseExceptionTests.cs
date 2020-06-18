using System;
using System.Net;
using System.Net.Http;

using Altinn.Platform.Authentication.Services;

using Xunit;

namespace Altinn.Platform.Authentication.Tests.Services
{
    /// <summary>
    /// Represents a collection of unit test, testing the <see cref="SblBridgeResponseException"/> class.
    /// </summary>
    public class SblBridgeResponseExceptionTests
    {
        /// <summary>
        /// Testing the <see cref="SblBridgeResponseException"/> class constructors.
        /// </summary>
        [Fact]
        public void Constructor_WithHttpResponsMessage_ExceptionMessageMatchReasonPhrase()
        {
            // Arrange
            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.BadRequest,
                ReasonPhrase = "BadRequest"
            };

            // Act
            var actual = new SblBridgeResponseException(httpResponseMessage);

            // Assert
            Assert.NotNull(actual);
            Assert.NotNull(actual.Response);
            Assert.Equal("BadRequest", actual.Message);
        }

        /// <summary>
        /// Testing the <see cref="SblBridgeResponseException"/> class constructors.
        /// </summary>
        [Fact]
        public void Constructor_WithHttpResponsMessageAndMessage_ExceptionMessageMatchInputMessage()
        {
            // Arrange
            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.BadRequest,
                ReasonPhrase = "BadRequest"
            };

            // Act
            var actual = new SblBridgeResponseException(httpResponseMessage, "Message");

            // Assert
            Assert.NotNull(actual);
            Assert.NotNull(actual.Response);
            Assert.Equal("Message", actual.Message);
        }

        /// <summary>
        /// Testing the <see cref="SblBridgeResponseException"/> class constructors.
        /// </summary>
        [Fact]
        public void Constructor_WithHttpResponsMessageAndMessageAndInnerException_ExceptionMessageMatchInputMessageAndInnerExceptionNotNull()
        {
            // Arrange
            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.BadRequest,
                ReasonPhrase = "BadRequest"
            };

            // Act
            var actual = new SblBridgeResponseException(httpResponseMessage, "Message", new NotImplementedException());

            // Assert
            Assert.NotNull(actual);
            Assert.NotNull(actual.Response);
            Assert.Equal("Message", actual.Message);
            Assert.NotNull(actual.InnerException);
        }
    }
}

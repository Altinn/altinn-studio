using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Altinn.App.Common.RequestHandling;
using Altinn.Platform.Storage.Interface.Models;

using App.IntegrationTests.Utils;

using Xunit;

namespace App.IntegrationTestsRef.CommonTests.RequestHandling
{
    public class RequestPartValidatorTest
    {
        [Fact]
        public void ValidatePart_InvalidDataType()
        {
            // Arrange
            Application app = TestDataUtil.GetApplication("ttd", "events");
            string partName = "kattebilde";

            RequestPart part = new RequestPart
            {
                Name = partName
            };

            string expectedErrorMessage = $"Multipart section named, '{partName}' does not correspond to an element type in application metadata";
            RequestPartValidator sut = new RequestPartValidator(app);

            // Act
            string actual = sut.ValidatePart(part);

            // Assert
            Assert.Equal(expectedErrorMessage, actual);
        }

        [Fact]
        public void ValidatePart_MissingContentType()
        {
            // Arrange
            Application app = TestDataUtil.GetApplication("ttd", "events");
            string partName = "hundebilde";

            RequestPart part = new RequestPart
            {
                Name = partName
            };

            string expectedErrorMessage = $"The multipart section named {partName} is missing Content-Type.";
            RequestPartValidator sut = new RequestPartValidator(app);

            // Act
            string actual = sut.ValidatePart(part);

            // Assert
            Assert.Equal(expectedErrorMessage, actual);
        }

        [Fact]
        public void ValidatePart_InvalidContentType()
        {
            // Arrange
            Application app = TestDataUtil.GetApplication("ttd", "events");
            string partName = "hundebilde";
            string dataTypeId = "hundebilde";
            string contentType = "application/xml";

            RequestPart part = new RequestPart
            {
                Name = partName,
                ContentType = contentType
            };

            string expectedErrorMessage = $"The multipart section named {partName} has a Content-Type '{contentType}' which is invalid for element type '{dataTypeId}'";
            RequestPartValidator sut = new RequestPartValidator(app);

            // Act
            string actual = sut.ValidatePart(part);

            // Assert
            Assert.Equal(expectedErrorMessage, actual);
        }

        [Fact]
        public void ValidatePart_InvalidContentSize()
        {
            // Arrange
            Application app = TestDataUtil.GetApplication("ttd", "events");
            string partName = "hundebilde";
            string contentType = "application/pdf";

            using Stream stream = new MemoryStream();

            RequestPart part = new RequestPart
            {
                Name = partName,
                ContentType = contentType,
                Stream = stream
            };

            string expectedErrorMessage = $"The multipart section named {partName} has no data. Cannot process empty part.";
            RequestPartValidator sut = new RequestPartValidator(app);

            // Act
            string actual = sut.ValidatePart(part);

            // Assert
            Assert.Equal(expectedErrorMessage, actual);
        }

        [Fact]
        public void ValidatePart_ExceedsAllowedContentSize()
        {
            // Arrange
            Application app = TestDataUtil.GetApplication("ttd", "events");
            string partName = "hundebilde";
            string dataTypeId = "hundebilde";
            string contentType = "application/pdf";

            RequestPart part = new RequestPart
            {
                Name = partName,
                ContentType = contentType,
                FileSize = 1337 * 1024 * 1024
            };

            string expectedErrorMessage = $"The multipart section named {partName} exceeds the size limit of element type '{dataTypeId}'";
            RequestPartValidator sut = new RequestPartValidator(app);

            // Act
            string actual = sut.ValidatePart(part);

            // Assert
            Assert.Equal(expectedErrorMessage, actual);
        }

        [Fact]
        public void ValidatePart_ValidateInstance_InvalidContentType()
        {
            // Arrange
            Application app = TestDataUtil.GetApplication("ttd", "events");
            string partName = "instance";
            string contentType = "application/pdf";

            RequestPart part = new RequestPart
            {
                Name = partName,
                ContentType = contentType,
            };

            string expectedErrorMessage = $"Unexpected Content-Type '{contentType}' of embedded instance template. Expecting 'application/json'";
            RequestPartValidator sut = new RequestPartValidator(app);

            // Act
            string actual = sut.ValidatePart(part);

            // Assert
            Assert.Equal(expectedErrorMessage, actual);
        }
    }
}

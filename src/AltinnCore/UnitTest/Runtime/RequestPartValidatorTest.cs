using System.Collections.Generic;
using System.IO;
using System.Text;
using Altinn.Platform.Storage.Models;

using AltinnCore.Runtime.RequestHandling;

using Xunit;

namespace AltinnCore.UnitTest.Runtime
{
    /// <summary>
    /// Represents all unit tests of the <see cref="RequestPartValidator"/> class.
    /// </summary>
    public class RequestPartValidatorTest
    {
        /// <summary>
        /// Scenario:
        ///   Validator is given a valid element.
        /// Expected result:
        ///   Validation completes without issues.
        /// Success criteria:
        ///   Validation returns null
        /// </summary>
        [Fact]
        public void ValidatePartTest_ValidElement_ReturnsNull()
        {
            // Arrange
            Application application = new Application
            {
                ElementTypes = new List<ElementType>
                {
                    new ElementType { Id = "default", AllowedContentType = new List<string> { "application/xml" }, MaxCount = 1 }
                }
            };

            RequestPartValidator target = new RequestPartValidator(application);

            RequestPart part = new RequestPart
            {
                Name = "default",
                ContentType = "application/xml",
                Stream = new MemoryStream(Encoding.UTF8.GetBytes("viktig melding"))
            };

            // Act
            string error = target.ValidatePart(part);

            // Assert
            Assert.Null(error);
        }

        /// <summary>
        /// Scenario:
        ///   Validator is given a valid instance element.
        /// Expected result:
        ///   Validation completes without issues.
        /// Success criteria:
        ///   Validation returns null
        /// </summary>
        [Fact]
        public void ValidatePartTest_ValidInstanceElement_ReturnsNull()
        {
            // Arrange
            Application application = new Application();

            RequestPartValidator target = new RequestPartValidator(application);

            RequestPart part = new RequestPart
            {
                Name = "instance",
                ContentType = "application/json",
                Stream = new MemoryStream(Encoding.UTF8.GetBytes("viktig melding")) // Content isn't validated atm.
            };

            // Act
            string error = target.ValidatePart(part);

            // Assert
            Assert.Null(error);
        }

        /// <summary>
        /// Scenario:
        ///   Validator is given an instance element with wrong content type
        /// Expected result:
        ///   Validation completes without issues.
        /// Success criteria:
        ///   Validation returns null
        /// </summary>
        [Fact]
        public void ValidatePartTest_InstanceElementWithWrongContentType_ReturnsError()
        {
            // Arrange
            Application application = new Application();

            RequestPartValidator target = new RequestPartValidator(application);

            RequestPart part = new RequestPart
            {
                Name = "instance",
                ContentType = "application/xml",
                Stream = new MemoryStream(Encoding.UTF8.GetBytes("viktig melding")) // Content isn't validated atm.
            };

            // Act
            string error = target.ValidatePart(part);

            // Assert
            Assert.Contains("Expecting 'application/json'", error);
        }

        /// <summary>
        /// Scenario:
        ///   Validator is given a list of valid elements
        /// Expected result:
        ///   Validation completes without issues.
        /// Success criteria:
        ///   Validation returns null
        /// </summary>
        [Fact]
        public void ValidatePartsTest_ListOfValidElements_ReturnsNull()
        {
            // Arrange
            Application application = new Application
            {
                ElementTypes = new List<ElementType>
                {
                    new ElementType { Id = "story", AllowedContentType = new List<string> { "application/text" }, MaxCount = 2 }
                }
            };

            RequestPartValidator target = new RequestPartValidator(application);

            List<RequestPart> parts = new List<RequestPart>
            {
                new RequestPart
                {
                    Name = "story",
                    ContentType = "application/text",
                    Stream = new MemoryStream(Encoding.UTF8.GetBytes("det var en gang"))
                },
                new RequestPart
                {
                    Name = "story",
                    ContentType = "application/text",
                    Stream = new MemoryStream(Encoding.UTF8.GetBytes("en stor ku"))
                }
            };

            // Act
            string error = target.ValidateParts(parts);

            // Assert
            Assert.Null(error);
        }

        /// <summary>
        /// Scenario:
        ///   Validator is given a list of elements where the count is higher than the max for one of the element types.
        /// Expected result:
        ///   Validation completes without issues.
        /// Success criteria:
        ///   Validation returns null
        /// </summary>
        [Fact]
        public void ValidatePartsTest_ListHasTooManyElementsOfOneType_ReturnsErrorMessage()
        {
            // Arrange
            Application application = new Application
            {
                ElementTypes = new List<ElementType>
                {
                    new ElementType { Id = "story", AllowedContentType = new List<string> { "application/text" }, MaxCount = 1 }
                }
            };

            RequestPartValidator target = new RequestPartValidator(application);

            List<RequestPart> parts = new List<RequestPart>
            {
                new RequestPart
                {
                    Name = "story",
                    ContentType = "application/text",
                    Stream = new MemoryStream(Encoding.UTF8.GetBytes("det var en gang"))
                },
                new RequestPart
                {
                    Name = "story",
                    ContentType = "application/text",
                    Stream = new MemoryStream(Encoding.UTF8.GetBytes("en stor ku"))
                }
            };

            // Act
            string error = target.ValidateParts(parts);

            // Assert
            Assert.Contains("than the element type allows", error);
        }
    }
}

using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;

using AltinnCore.Runtime.RequestHandling;

using Microsoft.AspNetCore.Http;

using Moq;
using Newtonsoft.Json;
using Xunit;

namespace AltinnCore.UnitTest.Runtime
{
    /// <summary>
    /// Represents all unit tests of the <see cref="MultipartRequestReader"/> class.
    /// </summary>
    public class MultipartRequestReaderTest
    {
        /// <summary>
        /// Scenario:
        ///   Trying to read a request with two parts. One instance and one file.
        /// Expected result:
        ///   Read is successful.
        /// Success criteria:
        ///   The resulting list of parts have two elements with correct properties.
        /// </summary>
        [Fact]
        public async Task ReadTest_RequestContainsInstanceAndFile_CreatesTwoRequestParts()
        {
            // Arrange
            const string Boundary = "9051914041544843365972754266";
            MultipartFormDataContent multiPartContent = new MultipartFormDataContent(Boundary);
            multiPartContent.AddInstance("23094190088");
            multiPartContent.AddFileElement("vedlegg1", "fake.jpg", 2);

            Mock<HttpRequest> request = new Mock<HttpRequest>();
            request.SetupGet(x => x.ContentType).Returns("multipart/form-data; boundary=" + Boundary);
            request.SetupGet(x => x.Body).Returns(await multiPartContent.ReadAsStreamAsync());

            MultipartRequestReader target = new MultipartRequestReader(request.Object);

            // Act
            await target.Read();

            // Assert
            Assert.True(target.IsMultipart);
            Assert.Equal(2, target.Parts.Count);
            Assert.Equal("instance", target.Parts[0].Name);
            Assert.Equal("application/json; charset=utf-8", target.Parts[0].ContentType);
            Assert.Equal("fake.jpg", target.Parts[1].FileName);
            Assert.Equal("application/octet-stream", target.Parts[1].ContentType);
        }

        /// <summary>
        /// Scenario:
        ///   Trying to read a request with no parts.
        /// Expected result:
        ///   Read is successful.
        /// Success criteria:
        ///   The resulting list of parts have no elements. The error list have one element.
        /// </summary>
        [Fact]
        public async Task ReadTest_RequestContainsNoParts_CreatesNoRequestPartsProvidesOneError()
        {
            // Arrange
            const string Boundary = "9051914041544843365972754266";
            MultipartFormDataContent multiPartContent = new MultipartFormDataContent(Boundary);

            Mock<HttpRequest> request = new Mock<HttpRequest>();
            request.SetupGet(x => x.ContentType).Returns("multipart/form-data; boundary=" + Boundary);
            request.SetupGet(x => x.Body).Returns(await multiPartContent.ReadAsStreamAsync());

            MultipartRequestReader target = new MultipartRequestReader(request.Object);

            // Act
            await target.Read();

            // Assert
            Assert.True(target.IsMultipart);
            Assert.Empty(target.Parts);
            Assert.Equal(2, target.Errors.Count);
            Assert.Contains("IOException", target.Errors[1]);
        }

        /// <summary>
        /// Scenario:
        ///   Trying to read a request that is not a multipart request, but with a single element.
        /// Expected result:
        ///   Read is successful.
        /// Success criteria:
        ///   The resulting list of parts have one element with correct properties.
        /// </summary>
        [Fact]
        public async Task ReadTest_RequesNotMultipartSingleInstance_CreatesSinglePart()
        {
            // Arrange
            Instance instanceTemplate = new Instance()
            {
                InstanceOwnerLookup = new InstanceOwnerLookup()
                {
                    PersonNumber = "23094190088"
                }
            };

            StringContent instanceContent = new StringContent(JsonConvert.SerializeObject(instanceTemplate), Encoding.UTF8, "application/json");

            Mock<HttpRequest> request = new Mock<HttpRequest>();
            request.SetupGet(x => x.ContentType).Returns("application/json; charset=utf-8");
            request.SetupGet(x => x.Body).Returns(await instanceContent.ReadAsStreamAsync());

            MultipartRequestReader target = new MultipartRequestReader(request.Object);

            // Act
            await target.Read();

            // Assert
            Assert.False(target.IsMultipart);
            Assert.Single(target.Parts);
            Assert.Equal("application/json; charset=utf-8", target.Parts[0].ContentType);
        }
    }

    /// <summary>
    /// Represents a collection of extension methods for the <see cref="MultipartFormDataContent"/> to help with the construction of
    /// multipart requests in unit testing.
    /// </summary>
    internal static class MultipartFormDataContentExtensions
    {
        /// <summary>
        /// Add a content part of the type <see cref="Instance"/>.
        /// </summary>
        /// <param name="multiPartContent">The <see cref="MultipartFormDataContent"/> which the part should be added to.</param>
        /// <param name="personNumber">The person number to set as instance owner.</param>
        public static void AddInstance(this MultipartFormDataContent multiPartContent, string personNumber)
        {
            Instance instanceTemplate = new Instance()
            {
                InstanceOwnerLookup = new InstanceOwnerLookup()
                {
                    PersonNumber = personNumber
                }
            };

            StringContent instanceContent = new StringContent(JsonConvert.SerializeObject(instanceTemplate), Encoding.UTF8, "application/json");
            multiPartContent.Add(instanceContent, "instance");
        }

        /// <summary>
        /// Add a content part of the type <see cref="Instance"/>.
        /// </summary>
        /// <param name="multiPartContent">The <see cref="MultipartFormDataContent"/> which the part should be added to.</param>
        /// <param name="elementType">The name of the file element</param>
        /// <param name="fileName">The person number to set as instance owner.</param>
        /// <param name="sizeInMB">The size of the file to be generated.</param>
        public static void AddFileElement(this MultipartFormDataContent multiPartContent, string elementType, string fileName, int sizeInMB)
        {
            byte[] data = new byte[8192];
            Random rng = new Random();

            using (FileStream stream = File.OpenWrite(fileName))
            {
                for (int i = 0; i < sizeInMB * 128; i++)
                {
                    rng.NextBytes(data);
                    stream.Write(data, 0, data.Length);
                }
            }

            FileStream fileStream = new FileStream(fileName, FileMode.Open, FileAccess.Read);
            StreamContent streamContent = new StreamContent(fileStream);
            streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/octet-stream");

            multiPartContent.Add(streamContent, elementType, fileName);
        }
    }
}

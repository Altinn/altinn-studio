using System.IO;
using System.Threading.Tasks;

using Altinn.App.Common.Serialization;

using Microsoft.Extensions.Logging;

using Moq;
using Xunit;

namespace Altinn.App.IntegrationTests.Serialization
{
    public class ModelDeserializerTests
    {
        [Fact]
        public async Task DeserializeAsync_InputValidModelAsJson_ReturnsInitializedModel_ErrorIsNull()
        {
            // Arrange
            Mock<ILogger> logger = new Mock<ILogger>();
            ModelDeserializer target = new ModelDeserializer(logger.Object, typeof(Skjema));

            string serializedModel = string.Empty
                + @"{"
                + @"  ""skjemanummer"": ""1472"","
                + @"  ""spesifikasjonsnummer"": ""9812"","
                + @"  ""blankettnummer"": ""AFP-01"","
                + @"  ""tittel"": ""Arbeidsgiverskjema AFP"","
                + @"  ""gruppeid"": ""8818"","
                + @"  ""foretakgrp8820"": {"
                + @"    ""gruppeid"": ""8820"","
                + @"    ""enhetNavnEndringdatadef31"": {"
                + @"      ""orid"": ""31"","
                + @"      ""value"": ""Test Test 123"""
                + @"    }"
                + @"  }"
                + @"}";

            // Act
            object model;
            using (Stream stream = CreateStream(serializedModel))
            {
                model = await target.DeserializeAsync(stream, "application/json");
            }

            Skjema actual = model as Skjema;

            // Assert
            Assert.NotNull(actual);
            Assert.Null(target.Error);

            Assert.Equal("Test Test 123", actual?.Foretakgrp8820?.EnhetNavnEndringdatadef31?.value);
            Assert.Equal(1472, actual?.skjemanummer);
        }

        [Fact]
        public async Task DeserializeAsync_InputValidModelAsXml_ReturnsInitializedModel_ErrorIsNull()
        {
            // Arrange
            Mock<ILogger> logger = new Mock<ILogger>();
            ModelDeserializer target = new ModelDeserializer(logger.Object, typeof(Skjema));

            string serializedModel = string.Empty
                + @"<?xml version=""1.0""?>"
                + @"<Skjema xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" xmlns:xsd=""http://www.w3.org/2001/XMLSchema"""
                + @"  skjemanummer=""1472"" spesifikasjonsnummer=""9812"" blankettnummer=""AFP-01"" tittel=""Arbeidsgiverskjema AFP"" gruppeid=""8818"">"
                + @"  <Foretak-grp-8820 gruppeid=""8820"">"
                + @"    <EnhetNavnEndring-datadef-31 orid=""31"">Test Test 123</EnhetNavnEndring-datadef-31>"
                + @"  </Foretak-grp-8820>"
                + @"</Skjema>";

            // Act
            object model;
            using (Stream stream = CreateStream(serializedModel))
            {
                model = await target.DeserializeAsync(stream, "application/xml");
            }

            Skjema actual = model as Skjema;

            // Assert
            Assert.NotNull(actual);
            Assert.Null(target.Error);

            Assert.Equal("Test Test 123", actual?.Foretakgrp8820?.EnhetNavnEndringdatadef31?.value);
            Assert.Equal(1472, actual?.skjemanummer);
        }

        [Fact]
        public async Task DeserializeAsync_InputValidModelAsXmlWithoutNamespace_ReturnsInitializedModel_ErrorIsNull()
        {
            // Arrange
            Mock<ILogger> logger = new Mock<ILogger>();
            ModelDeserializer target = new ModelDeserializer(logger.Object, typeof(SkjemaWithNamespace));

            string serializedModel = string.Empty
                + @"<?xml version=""1.0""?>"
                + @"<Skjema xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" xmlns:xsd=""http://www.w3.org/2001/XMLSchema"""
                + @"  skjemanummer=""1472"" spesifikasjonsnummer=""9812"" blankettnummer=""AFP-01"" tittel=""Arbeidsgiverskjema AFP"" gruppeid=""8818"">"
                + @"  <Foretak-grp-8820 gruppeid=""8820"">"
                + @"    <EnhetNavnEndring-datadef-31 orid=""31"">Test Test 123</EnhetNavnEndring-datadef-31>"
                + @"  </Foretak-grp-8820>"
                + @"</Skjema>";

            // Act
            object model;
            using (Stream stream = CreateStream(serializedModel))
            {
                model = await target.DeserializeAsync(stream, "application/xml");
            }

            SkjemaWithNamespace actual = model as SkjemaWithNamespace;

            // Assert
            Assert.NotNull(actual);
            Assert.Null(target.Error);

            Assert.Equal("Test Test 123", actual?.Foretakgrp8820?.EnhetNavnEndringdatadef31?.value);
            Assert.Equal(1472, actual?.skjemanummer);
        }

        [Fact]
        public async Task DeserializeAsync_InputValidModelAsXmlWithNamespace_ReturnsInitializedModel_ErrorIsNull()
        {
            // Arrange
            Mock<ILogger> logger = new Mock<ILogger>();
            ModelDeserializer target = new ModelDeserializer(logger.Object, typeof(SkjemaWithNamespace));

            string serializedModel = string.Empty
                + @"<?xml version=""1.0""?>"
                + @"<Skjema xmlns=""urn:no:altinn:skjema:v1"" xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" xmlns:xsd=""http://www.w3.org/2001/XMLSchema"""
                + @"  skjemanummer=""1472"" spesifikasjonsnummer=""9812"" blankettnummer=""AFP-01"" tittel=""Arbeidsgiverskjema AFP"" gruppeid=""8818"">"
                + @"  <Foretak-grp-8820 gruppeid=""8820"">"
                + @"    <EnhetNavnEndring-datadef-31 orid=""31"">Test Test 123</EnhetNavnEndring-datadef-31>"
                + @"  </Foretak-grp-8820>"
                + @"</Skjema>";

            // Act
            object model;
            using (Stream stream = CreateStream(serializedModel))
            {
                model = await target.DeserializeAsync(stream, "application/xml");
            }

            SkjemaWithNamespace actual = model as SkjemaWithNamespace;

            // Assert
            Assert.NotNull(actual);
            Assert.Null(target.Error);

            Assert.Equal("Test Test 123", actual?.Foretakgrp8820?.EnhetNavnEndringdatadef31?.value);
            Assert.Equal(1472, actual?.skjemanummer);
        }

        [Fact]
        public async Task DeserializeAsync_InputInvalidModelAsJson_ReturnsNull_ErrorIsPopulated()
        {
            // Arrange
            Mock<ILogger> logger = new Mock<ILogger>();
            ModelDeserializer target = new ModelDeserializer(logger.Object, typeof(Skjema));

            string serializedModel = string.Empty
                + @"{"
                + @"  ""skjemanummer"": ""hei"","
                + @"  ""spesifikasjonsnummer"": ""9812"","
                + @"  ""blankettnummer"": ""AFP-01"","
                + @"  ""tittel"": ""Arbeidsgiverskjema AFP"","
                + @"  ""gruppeid"": ""8818"","
                + @"  ""foretakgrp8820"": {"
                + @"    ""gruppeid"": ""8820"","
                + @"    ""enhetNavnEndringdatadef31"": {"
                + @"      ""orid"": ""31"","
                + @"      ""value"": ""Test Test 123"""
                + @"    }"
                + @"  }"
                + @"}";

            // Act
            object model;
            using (Stream stream = CreateStream(serializedModel))
            {
                model = await target.DeserializeAsync(stream, "application/json");
            }

            Skjema actual = model as Skjema;

            // Assert
            Assert.Null(actual);

            Assert.Contains("Could not convert string to decimal: hei. Path 'skjemanummer'", target?.Error);
        }

        [Fact]
        public async Task DeserializeAsync_InputInvalidModelAsXml_ReturnsNull_ErrorIsPopulated()
        {
            // Arrange
            Mock<ILogger> logger = new Mock<ILogger>();
            ModelDeserializer target = new ModelDeserializer(logger.Object, typeof(Skjema));

            string serializedModel = string.Empty
                + @"<?xml version=""1.0""?>"
                + @"<Skjema xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" xmlns:xsd=""http://www.w3.org/2001/XMLSchema"""
                + @"  skjemanummer=""hei"" spesifikasjonsnummer=""9812"" blankettnummer=""AFP-01"" tittel=""Arbeidsgiverskjema AFP"" gruppeid=""8818"">"
                + @"  <Foretak-grp-8820 gruppeid=""8820"">"
                + @"    <EnhetNavnEndring-datadef-31 orid=""31"">Test Test 123</EnhetNavnEndring-datadef-31>"
                + @"  </Foretak-grp-8820>"
                + @"</Skjema>";

            // Act
            object model;
            using (Stream stream = CreateStream(serializedModel))
            {
                model = await target.DeserializeAsync(stream, "application/xml");
            }

            Skjema actual = model as Skjema;

            // Assert
            Assert.Null(actual);

            Assert.Contains("There is an error in XML document ", target?.Error);
        }

        [Fact]
        public async Task DeserializeAsync_InputValidModelAsXml_UnexpectedExceptionDuringDeserialization_ReturnsNull_ErrorIsPopulated()
        {
            // Arrange
            Mock<ILogger> logger = new Mock<ILogger>();
            ModelDeserializer target = new ModelDeserializer(logger.Object, typeof(Skjema));

            string serializedModel = string.Empty
                + @"<?xml version=""1.0""?>"
                + @"<Skjema xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" xmlns:xsd=""http://www.w3.org/2001/XMLSchema"""
                + @"  skjemanummer=""1472"" spesifikasjonsnummer=""9812"" blankettnummer=""AFP-01"" tittel=""Arbeidsgiverskjema AFP"" gruppeid=""8818"">"
                + @"  <Foretak-grp-8820 gruppeid=""8820"">"
                + @"    <EnhetNavnEndring-datadef-31 orid=""31"">Test Test 123</EnhetNavnEndring-datadef-31>"
                + @"  </Foretak-grp-8820>"
                + @"</Skjema>";

            // Act
            object model;
            using (Stream stream = CreateStream(serializedModel))
            {
                // Force an exception
                stream.Close();
                model = await target.DeserializeAsync(stream, "application/xml");
            }

            Skjema actual = model as Skjema;

            // Assert
            Assert.Null(actual);

            Assert.Contains("Unexpected exception when attempting to deserialize", target?.Error);
        }

        [Fact]
        public async Task DeserializeAsync_InputValidModelAsJson_UnexpectedExceptionDuringDeserialization_ReturnsNull_ErrorIsPopulated()
        {
            // Arrange
            Mock<ILogger> logger = new Mock<ILogger>();
            ModelDeserializer target = new ModelDeserializer(logger.Object, typeof(Skjema));

            string serializedModel = string.Empty
                + @"{"
                + @"  ""skjemanummer"": ""1472"","
                + @"  ""spesifikasjonsnummer"": ""9812"","
                + @"  ""blankettnummer"": ""AFP-01"","
                + @"  ""tittel"": ""Arbeidsgiverskjema AFP"","
                + @"  ""gruppeid"": ""8818"","
                + @"  ""foretakgrp8820"": {"
                + @"    ""gruppeid"": ""8820"","
                + @"    ""enhetNavnEndringdatadef31"": {"
                + @"      ""orid"": ""31"","
                + @"      ""value"": ""Test Test 123"""
                + @"    }"
                + @"  }"
                + @"}";

            // Act
            object model;
            using (Stream stream = CreateStream(serializedModel))
            {
                // Force an exception
                stream.Close();
                model = await target.DeserializeAsync(stream, "application/json");
            }

            Skjema actual = model as Skjema;

            // Assert
            Assert.Null(actual);

            Assert.Contains("Unexpected exception when attempting to deserialize", target?.Error);
        }

        [Fact]
        public async Task DeserializeAsync_InputUnsupportedContentType_ReturnsNull_ErrorIsPopulated()
        {
            // Arrange
            Mock<ILogger> logger = new Mock<ILogger>();
            ModelDeserializer target = new ModelDeserializer(logger.Object, typeof(Skjema));

            string serializedModel = @"Text plain";

            // Act
            object model;
            using (Stream stream = CreateStream(serializedModel))
            {
                model = await target.DeserializeAsync(stream, "text/plain");
            }

            Skjema actual = model as Skjema;

            // Assert
            Assert.Null(actual);

            Assert.Contains("Unknown content type ", target?.Error);
        }

        private static Stream CreateStream(string text)
        {
            MemoryStream stream = new MemoryStream();
            StreamWriter writer = new StreamWriter(stream);
            writer.Write(text);
            writer.Flush();
            stream.Position = 0;
            return stream;
        }
    }
}

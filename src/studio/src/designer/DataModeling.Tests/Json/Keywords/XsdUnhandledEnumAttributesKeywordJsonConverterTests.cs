using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using Altinn.Studio.DataModeling.Json.Keywords;
using FluentAssertions;
using Xunit;
using static Altinn.Studio.DataModeling.Json.Keywords.XsdUnhandledEnumAttributesKeyword;

namespace DataModeling.Tests.Json.Keywords
{
    public class XsdUnhandledEnumAttributesKeywordJsonConverterTests
    {
        [Fact]
        public void Read_ValidJson_ShouldReadFromJson()
        {
            // Arrange
            var keywordConverter = new XsdUnhandledEnumAttributesKeywordJsonConverter();
            ReadOnlySpan<byte> jsonBytes = Encoding.UTF8.GetBytes(@"{""@xsdUnhandledEnumAttributes"":{""frontend"":{""seres:elementtype"":""Datakodeelement"",""seres:guid"":""http://seres.no/guid/Kursdomene/Datakodeelement/other/784952""},""backend"":{""seres:elementtype"":""Datakodeelement"",""seres:guid"":""http://seres.no/guid/Kursdomene/Datakodeelement/other/784951""},""other"":{""seres:elementtype"":""Datakodeelement"",""seres:guid"":""http://seres.no/guid/Kursdomene/Datakodeelement/other/784950""}}}");
            var jsonReader = new Utf8JsonReader(jsonBytes);

            // Act
            var xsdUnhandledEnumAttributesKeyword = keywordConverter.Read(ref jsonReader, typeof(XsdUnhandledAttributesKeyword), new System.Text.Json.JsonSerializerOptions());

            // Assert
            xsdUnhandledEnumAttributesKeyword.Properties.Should().HaveCount(3);
            xsdUnhandledEnumAttributesKeyword.Properties.Single(p => p.Name == "frontend").Properties.Should().HaveCount(2);
            xsdUnhandledEnumAttributesKeyword.Properties.Single(p => p.Name == "backend").Properties.Should().HaveCount(2);
            xsdUnhandledEnumAttributesKeyword.Properties.Single(p => p.Name == "other").Properties.Should().HaveCount(2);
        }

        [Fact]
        public void Write_ValidStructure_ShouldWriteToJson()
        {
            // Arrange
            var namedValueKeyPairsFrontend = new NamedKeyValuePairs("frontend");
            namedValueKeyPairsFrontend.Add("seres:elementtype", "Datakodeelement");
            namedValueKeyPairsFrontend.Add("seres:guid", "http://seres.no/guid/Kursdomene/Datakodeelement/other/784952");

            var namedValueKeyPairsBackend = new NamedKeyValuePairs("backend");
            namedValueKeyPairsBackend.Add("seres:elementtype", "Datakodeelement");
            namedValueKeyPairsBackend.Add("seres:guid", "http://seres.no/guid/Kursdomene/Datakodeelement/other/784951");

            var namedValueKeyPairsOther = new NamedKeyValuePairs("other");
            namedValueKeyPairsOther.Add("seres:elementtype", "Datakodeelement");
            namedValueKeyPairsOther.Add("seres:guid", "http://seres.no/guid/Kursdomene/Datakodeelement/other/784950");

            var keyword = new XsdUnhandledEnumAttributesKeyword(new NamedKeyValuePairs[] { namedValueKeyPairsFrontend, namedValueKeyPairsBackend, namedValueKeyPairsOther });

            // Act
            var keywordConverter = new XsdUnhandledEnumAttributesKeywordJsonConverter();
            var jsonStream = new MemoryStream();
            var jsonWriter = new Utf8JsonWriter(jsonStream);
            jsonWriter.WriteStartObject();
            keywordConverter.Write(jsonWriter, keyword, new JsonSerializerOptions());
            jsonWriter.WriteEndObject();
            jsonWriter.Flush();

            // Assert
            jsonStream.Seek(0, SeekOrigin.Begin);
            var streamReader = new StreamReader(jsonStream);
            var jsonText = streamReader.ReadToEnd();

            jsonText.Should().Be(@"{""@xsdUnhandledEnumAttributes"":{""frontend"":{""seres:elementtype"":""Datakodeelement"",""seres:guid"":""http://seres.no/guid/Kursdomene/Datakodeelement/other/784952""},""backend"":{""seres:elementtype"":""Datakodeelement"",""seres:guid"":""http://seres.no/guid/Kursdomene/Datakodeelement/other/784951""},""other"":{""seres:elementtype"":""Datakodeelement"",""seres:guid"":""http://seres.no/guid/Kursdomene/Datakodeelement/other/784950""}}}");
        }
    }
}

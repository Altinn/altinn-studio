using System.Text;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.AppModel;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Moq;

namespace Altinn.App.Core.Tests.Helpers;

public class ModelSerializationServiceFixedValueTests
{
    [XmlRoot("melding")]
    public class Melding
    {
        [XmlAttribute("dataFormatVersion")]
        [BindNever]
        public string dataFormatVersion { get; set; } = "46317";

        [XmlElement("navn")]
        [JsonPropertyName("navn")]
        public string? Navn { get; set; }

        [XmlElement("innhold")]
        [JsonPropertyName("innhold")]
        public List<Innhold>? Innhold { get; set; }
    }

    public class Innhold
    {
        [XmlAttribute("orid")]
        [BindNever]
        public int orid { get; set; } = 7117;

        [XmlText]
        [JsonPropertyName("value")]
        public string? Value { get; set; }
    }

    private const string WrongXml =
        """<melding dataFormatVersion="1"><navn>a</navn><innhold orid="1">b</innhold></melding>""";
    private const string WrongJson = """{"dataFormatVersion":"1","navn":"a","innhold":[{"orid":1,"value":"b"}]}""";
    private const string CorrectXml =
        """<melding dataFormatVersion="46317"><navn>a</navn><innhold orid="7117">b</innhold></melding>""";
    private const string CorrectJson =
        """{"dataFormatVersion":"46317","navn":"a","innhold":[{"orid":7117,"value":"b"}]}""";

    private static readonly DataType _dataType = new()
    {
        Id = "melding",
        AppLogic = new ApplicationLogic() { ClassRef = typeof(Melding).FullName },
        AllowedContentTypes = ["application/xml", "application/json"],
    };

    private static ModelSerializationService CreateService()
    {
        var appModel = new Mock<IAppModel>(MockBehavior.Strict);
        appModel.Setup(a => a.GetModelType(typeof(Melding).FullName!)).Returns(typeof(Melding));
        return new ModelSerializationService(appModel.Object);
    }

    private static void AssertRestored(object model)
    {
        var melding = Assert.IsType<Melding>(model);
        Assert.Equal("46317", melding.dataFormatVersion);
        Assert.Equal("a", melding.Navn);
        var innhold = Assert.Single(melding.Innhold!);
        Assert.Equal(7117, innhold.orid);
        Assert.Equal("b", innhold.Value);
    }

    [Theory]
    [InlineData("application/xml", WrongXml)]
    [InlineData("application/json", WrongJson)]
    public void DeserializeFromStorage_RestoresWrongFixedValues(string contentType, string data)
    {
        // Instances created before the fixed value changed must still load from storage,
        // and get the correct fixed values so that they are corrected the next time they are saved
        var dataElement = new DataElement() { Id = Guid.NewGuid().ToString(), ContentType = contentType };

        var model = CreateService().DeserializeFromStorage(Encoding.UTF8.GetBytes(data), _dataType, dataElement);

        AssertRestored(model);
    }

    [Theory]
    [InlineData("application/xml", WrongXml)]
    [InlineData("application/json", WrongJson)]
    public async Task DeserializeSingleFromStream_WrongFixedValues_ReturnsBadRequest(string contentType, string data)
    {
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(data));

        var result = await CreateService().DeserializeSingleFromStream(stream, contentType, _dataType);

        Assert.False(result.Success);
        Assert.Equal(400, result.Error.Status);
        Assert.Equal("Fixed value mismatch", result.Error.Title);
        Assert.Equal(
            "Property \"dataFormatVersion\" has the fixed value \"46317\", but was \"1\" "
                + "Property \"innhold[0].orid\" has the fixed value \"7117\", but was \"1\"",
            result.Error.Detail
        );
    }

    [Theory]
    [InlineData("application/xml", CorrectXml)]
    [InlineData("application/json", CorrectJson)]
    public async Task DeserializeSingleFromStream_CorrectFixedValues_ReturnsModel(string contentType, string data)
    {
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(data));

        var result = await CreateService().DeserializeSingleFromStream(stream, contentType, _dataType);

        Assert.True(result.Success);
        AssertRestored(result.Ok);
    }
}

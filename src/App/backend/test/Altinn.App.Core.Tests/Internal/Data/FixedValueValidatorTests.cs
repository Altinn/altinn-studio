using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Data;

public class FixedValueValidatorTests
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

    private static readonly DataType _dataType = new()
    {
        Id = "melding",
        AppLogic = new ApplicationLogic() { ClassRef = typeof(Melding).FullName },
        AllowedContentTypes = ["application/xml"],
    };

    private static IFormDataWrapper Wrap(Melding melding) => new ReflectionFormDataWrapper(melding, _dataType);

    private static void AssertRestored(Melding melding)
    {
        Assert.Equal("46317", melding.dataFormatVersion);
        Assert.All(melding.Innhold ?? [], innhold => Assert.Equal(7117, innhold.orid));
    }

    [Fact]
    public void RestoreFixedValues_DefaultValues_ReturnsNoErrors()
    {
        var melding = new Melding() { Innhold = [new Innhold() { Value = "a" }] };

        Assert.Empty(FixedValueValidator.RestoreFixedValues(Wrap(melding), previous: null));
        AssertRestored(melding);
    }

    [Fact]
    public void RestoreFixedValues_WithoutPrevious_ReportsAndRestoresAllMismatches()
    {
        var melding = new Melding()
        {
            dataFormatVersion = "1",
            Innhold = [new Innhold() { Value = "a" }, new Innhold() { orid = 1, Value = "b" }],
        };

        var errors = FixedValueValidator.RestoreFixedValues(Wrap(melding), previous: null);

        Assert.Equal(
            new List<FixedValueError> { new("dataFormatVersion", "46317", "1"), new("innhold[1].orid", "7117", "1") },
            errors
        );
        AssertRestored(melding);
        Assert.Equal("b", melding.Innhold[1].Value);
        var problem = FixedValueValidator.ToProblemDetails(errors);
        Assert.Equal(400, problem.Status);
        Assert.Equal("Fixed value mismatch", problem.Title);
        Assert.Equal(
            "Property \"dataFormatVersion\" has the fixed value \"46317\", but was \"1\" "
                + "Property \"innhold[1].orid\" has the fixed value \"7117\", but was \"1\"",
            problem.Detail
        );
    }

    [Fact]
    public void RestoreFixedValues_MismatchAlreadyStored_IsToleratedAndRestored()
    {
        // An instance stored before the fixed value changed keeps its old value when the client saves other changes.
        // The client is not blamed, but the saved data gets the correct fixed values.
        var previous = new Melding() { dataFormatVersion = "1", Innhold = [new Innhold() { orid = 1 }] };
        var current = new Melding()
        {
            dataFormatVersion = "1",
            Navn = "changed",
            Innhold = [new Innhold() { orid = 1, Value = "b" }],
        };

        Assert.Empty(FixedValueValidator.RestoreFixedValues(Wrap(current), Wrap(previous)));

        AssertRestored(current);
        // The stored data is left as is
        Assert.Equal("1", previous.dataFormatVersion);
        Assert.Equal(1, Assert.Single(previous.Innhold!).orid);
    }

    [Fact]
    public void RestoreFixedValues_MismatchChangedFromStored_IsReported()
    {
        var previous = new Melding() { dataFormatVersion = "1", Innhold = [new Innhold() { orid = 1 }] };
        var current = new Melding() { dataFormatVersion = "2", Innhold = [new Innhold() { orid = 1 }] };

        var errors = FixedValueValidator.RestoreFixedValues(Wrap(current), Wrap(previous));

        Assert.Equal(new List<FixedValueError> { new("dataFormatVersion", "46317", "2") }, errors);
        AssertRestored(current);
    }

    [Fact]
    public void DeserializeFromStorage_Xml_AcceptsWrongFixedValues()
    {
        // Instances created before the fixed value changed must still load from storage.
        var appModel = new Mock<IAppModel>(MockBehavior.Strict);
        appModel.Setup(a => a.GetModelType(typeof(Melding).FullName!)).Returns(typeof(Melding));
        var service = new ModelSerializationService(appModel.Object);
        var xml = """<melding dataFormatVersion="1"><innhold orid="1">a</innhold></melding>"""u8;
        var dataElement = new DataElement() { Id = Guid.NewGuid().ToString(), ContentType = "application/xml" };

        var model = service.DeserializeFromStorage(xml, _dataType, dataElement);

        var melding = Assert.IsType<Melding>(model);
        Assert.Equal("1", melding.dataFormatVersion);
        Assert.Equal(1, Assert.Single(melding.Innhold!).orid);
    }
}

using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.Helpers;

public class DataHelperTests
{
    private sealed class Soknad
    {
        public string? NavnElev { get; set; }

        public string? NavnElevManuelt { get; set; }
    }

    private sealed class Model
    {
        public Soknad Soknad { get; set; } = new();
    }

    private static Model Data =>
        new()
        {
            Soknad = new Soknad { NavnElev = "Kari", NavnElevManuelt = "Ola" },
        };

    private static DataField Field(string id, string path, string dataTypeId) =>
        new()
        {
            Id = id,
            Path = path,
            DataTypeId = dataTypeId,
        };

    [Fact]
    public void GetUpdatedDataValues_Returns_A_Value_Per_Field()
    {
        List<DataField> fields =
        [
            Field("Navn", "Soknad.NavnElev", "datamodel"),
            Field("NavnManuelt", "Soknad.NavnElevManuelt", "datamodel"),
        ];

        var updated = DataHelper.GetUpdatedDataValues(fields, [], "datamodel", Data, "presentationFields");

        Assert.Equal(new Dictionary<string, string?> { ["Navn"] = "Kari", ["NavnManuelt"] = "Ola" }, updated);
    }

    [Fact]
    public void GetUpdatedDataValues_Names_The_Configuration_When_Two_Fields_Share_An_Id()
    {
        // The shape that took an app down in production. Dictionary.Add reported only "an item with the
        // same key has already been added", which named neither the file nor the field at fault.
        List<DataField> fields =
        [
            Field("Navn", "Soknad.NavnElev", "datamodel"),
            Field("Navn", "Soknad.NavnElevManuelt", "datamodel"),
        ];

        var exception = Assert.Throws<ApplicationConfigException>(() =>
            DataHelper.GetUpdatedDataValues(fields, [], "datamodel", Data, "presentationFields")
        );

        Assert.Contains("applicationmetadata.json", exception.Message, StringComparison.Ordinal);
        Assert.Contains("'presentationFields'", exception.Message, StringComparison.Ordinal);
        Assert.Contains("'Navn'", exception.Message, StringComparison.Ordinal);
        Assert.Contains("'Soknad.NavnElev'", exception.Message, StringComparison.Ordinal);
        Assert.Contains("'Soknad.NavnElevManuelt'", exception.Message, StringComparison.Ordinal);
        Assert.Contains("'datamodel'", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void GetUpdatedDataValues_Names_DataFields_When_That_Is_The_Property_At_Fault()
    {
        List<DataField> fields =
        [
            Field("Navn", "Soknad.NavnElev", "datamodel"),
            Field("Navn", "Soknad.NavnElevManuelt", "datamodel"),
        ];

        var exception = Assert.Throws<ApplicationConfigException>(() =>
            DataHelper.GetUpdatedDataValues(fields, [], "datamodel", Data, "dataFields")
        );

        Assert.Contains("'dataFields'", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void GetUpdatedDataValues_Without_A_Property_Name_Names_Both_Properties()
    {
        List<DataField> fields =
        [
            Field("Navn", "Soknad.NavnElev", "datamodel"),
            Field("Navn", "Soknad.NavnElevManuelt", "datamodel"),
        ];

        var exception = Assert.Throws<ApplicationConfigException>(() =>
            DataHelper.GetUpdatedDataValues(fields, [], "datamodel", Data)
        );

        Assert.Contains("'Navn'", exception.Message, StringComparison.Ordinal);
        Assert.Contains("'presentationFields' or 'dataFields'", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("presentationFields/dataFields", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void GetUpdatedDataValues_Allows_An_Id_Reused_On_Another_Data_Type()
    {
        // Values for one data type are computed in their own pass, so an id shared across data types
        // resolves to last-writer-wins on the instance rather than a failure. Apps rely on this.
        List<DataField> fields =
        [
            Field("Navn", "Soknad.NavnElev", "datamodel"),
            Field("Navn", "Soknad.NavnElevManuelt", "other-model"),
        ];

        var updated = DataHelper.GetUpdatedDataValues(fields, [], "datamodel", Data, "presentationFields");

        Assert.Equal(new Dictionary<string, string?> { ["Navn"] = "Kari" }, updated);
    }

    [Fact]
    public void GetUpdatedDataValues_Computes_Matching_Fields_Behind_A_Field_For_Another_Data_Type()
    {
        // The entry for 'other-model' used to end the pass, so 'NavnManuelt' was never computed.
        List<DataField> fields =
        [
            Field("Navn", "Soknad.NavnElev", "datamodel"),
            Field("Ignorert", "Whatever.Path", "other-model"),
            Field("NavnManuelt", "Soknad.NavnElevManuelt", "datamodel"),
        ];

        var updated = DataHelper.GetUpdatedDataValues(fields, [], "datamodel", Data, "presentationFields");

        Assert.Equal(new Dictionary<string, string?> { ["Navn"] = "Kari", ["NavnManuelt"] = "Ola" }, updated);
    }

    [Fact]
    public void GetUpdatedDataValues_Computes_A_Field_Whose_Data_Type_Appears_Last()
    {
        // The shape brg/virksomhetsregistrering ships: one presentation slot fed from whichever of two
        // models the instance carries, with the second model's entry written last. Asking for that
        // second model used to yield nothing at all, because the very first entry ended the pass.
        List<DataField> fields =
        [
            Field("Virksomhetsnavn", "Soknad.NavnElev", "friv-model"),
            Field("Organisasjonsnummer", "Soknad.NavnElevManuelt", "friv-model"),
            Field("Virksomhetsnavn", "Soknad.NavnElevManuelt", "erfr-model"),
        ];

        var updated = DataHelper.GetUpdatedDataValues(fields, [], "erfr-model", Data, "presentationFields");

        Assert.Equal(new Dictionary<string, string?> { ["Virksomhetsnavn"] = "Ola" }, updated);
    }

    [Fact]
    public void GetUpdatedDataValues_Detects_A_Duplicate_Split_By_Another_Data_Type()
    {
        // Order no longer hides the collision either, which keeps the runtime agreeing with
        // ALTINNAPP0900 - the rule keys on (id, dataTypeId) wherever the entries sit.
        List<DataField> fields =
        [
            Field("Navn", "Soknad.NavnElev", "datamodel"),
            Field("Ignorert", "Whatever.Path", "other-model"),
            Field("Navn", "Soknad.NavnElevManuelt", "datamodel"),
        ];

        var exception = Assert.Throws<ApplicationConfigException>(() =>
            DataHelper.GetUpdatedDataValues(fields, [], "datamodel", Data, "presentationFields")
        );

        Assert.Contains("'Soknad.NavnElev'", exception.Message, StringComparison.Ordinal);
        Assert.Contains("'Soknad.NavnElevManuelt'", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void GetUpdatedDataValues_Returns_Nothing_When_No_Field_Matches_The_Data_Type()
    {
        List<DataField> fields = [Field("Navn", "Soknad.NavnElev", "other-model")];

        var updated = DataHelper.GetUpdatedDataValues(fields, [], "datamodel", Data, "presentationFields");

        Assert.Empty(updated);
    }

    [Fact]
    public void GetUpdatedDataValues_Reports_Only_Values_That_Changed()
    {
        List<DataField> fields = [Field("Navn", "Soknad.NavnElev", "datamodel")];
        Dictionary<string, string?> current = new() { ["Navn"] = "Kari" };

        var updated = DataHelper.GetUpdatedDataValues(fields, current, "datamodel", Data, "presentationFields");

        Assert.Empty(updated);
    }
}

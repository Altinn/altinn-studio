using Altinn.App.Analyzers.Metadata;
using Altinn.App.Analyzers.Tests.Fixtures;
using Microsoft.CodeAnalysis;

namespace Altinn.App.Analyzers.Tests.Metadata;

public class MetadataFieldUtilsTests
{
    private const string Path = "/repo/App/config/applicationmetadata.json";

    private static List<Diagnostic> Collect(string json)
    {
        var diagnostics = new List<Diagnostic>();
        MetadataFieldUtils.CollectFieldDiagnostics(
            new InMemoryAdditionalText(Path, json),
            CancellationToken.None,
            diagnostics
        );
        return diagnostics;
    }

    [Fact]
    public async Task Duplicate_PresentationField_Id_Emits_Error()
    {
        // The shape that took an app down: two entries keyed 'Navn' on the same data type.
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "dataTypes": [{ "id": "datamodel" }],
              "presentationFields": [
                { "id": "Navn", "path": "Soknad.NavnElev", "dataTypeId": "datamodel" },
                { "id": "Navn", "path": "Soknad.NavnElevManuelt", "dataTypeId": "datamodel" }
              ]
            }
            """
        );

        var duplicate = Assert.Single(diagnostics, d => d.Id == Diagnostics.Metadata.DuplicateFieldId.Id);
        Assert.Equal(DiagnosticSeverity.Error, duplicate.Severity);
        await Verify(diagnostics);
    }

    [Fact]
    public async Task Duplicate_DataField_Id_Emits_Error()
    {
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "dataTypes": [{ "id": "model" }],
              "dataFields": [
                { "id": "Beløp", "path": "Skjema.belop", "dataTypeId": "model" },
                { "id": "Beløp", "path": "Skjema.belopManuelt", "dataTypeId": "model" }
              ]
            }
            """
        );

        Assert.Single(diagnostics, d => d.Id == Diagnostics.Metadata.DuplicateFieldId.Id);
        await Verify(diagnostics);
    }

    [Fact]
    public void Duplicate_Id_Across_Different_Data_Types_Is_Not_Reported()
    {
        // Real apps do this on purpose: one presentation slot fed from whichever of several models an
        // instance carries. It resolves to last-writer-wins, not a failure, so the rule stays quiet.
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "dataTypes": [{ "id": "first" }, { "id": "second" }],
              "presentationFields": [
                { "id": "Virksomhetsnavn", "path": "A.navn", "dataTypeId": "first" },
                { "id": "Organisasjonsnummer", "path": "A.orgnr", "dataTypeId": "first" },
                { "id": "Virksomhetsnavn", "path": "B.navn", "dataTypeId": "second" }
              ]
            }
            """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Entries_Without_A_DataTypeId_Are_Not_Reported()
    {
        // The obsolete textResource/value/taskIds shape. Nothing matches an entry with no data type,
        // so it is never computed and cannot collide.
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "dataTypes": [{ "id": "model" }],
              "presentationFields": [
                { "id": "deadline", "textResource": "confirm.deadline", "value": "31.05.2021" },
                { "id": "deadline", "textResource": "confirm.other", "value": "noe annet" }
              ]
            }
            """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Three_Entries_Sharing_An_Id_Emit_One_Per_Extra_Entry()
    {
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "dataTypes": [{ "id": "model" }],
              "presentationFields": [
                { "id": "Navn", "path": "A", "dataTypeId": "model" },
                { "id": "Navn", "path": "B", "dataTypeId": "model" },
                { "id": "Navn", "path": "C", "dataTypeId": "model" }
              ]
            }
            """
        );

        Assert.Equal(2, diagnostics.Count(d => d.Id == Diagnostics.Metadata.DuplicateFieldId.Id));
    }

    [Fact]
    public void Ids_Differing_Only_By_Case_Are_Distinct_Keys()
    {
        // The instance dictionaries use the default (case-sensitive) comparer, so these coexist.
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "dataTypes": [{ "id": "model" }],
              "presentationFields": [
                { "id": "Navn", "path": "A", "dataTypeId": "model" },
                { "id": "navn", "path": "B", "dataTypeId": "model" }
              ]
            }
            """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void PascalCase_Property_Names_Are_Analyzed_Too()
    {
        // Real apps in the wild write "Id"/"Path"/"DataTypeId". The app backend deserializes
        // applicationmetadata.json case-insensitively, so these entries are live and must be checked.
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "DataTypes": [{ "Id": "MT3" }],
              "PresentationFields": [
                { "Id": "Navn", "Path": "Melder.navn", "DataTypeId": "MT3" },
                { "Id": "Navn", "Path": "Melder.navnManuelt", "DataTypeId": "MT3" }
              ]
            }
            """
        );

        Assert.Single(diagnostics, d => d.Id == Diagnostics.Metadata.DuplicateFieldId.Id);
    }

    [Fact]
    public void Case_Only_Duplicate_Property_Names_Resolve_The_Way_The_Runtime_Does()
    {
        // System.Text.Json permits duplicate properties (AllowDuplicateProperties) and binds them
        // last-one-wins, and with PropertyNameCaseInsensitive "dataTypeId"/"DataTypeId" are the same
        // property. So the runtime sees 'model' here, not 'typo-model', and nothing is wrong.
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "dataTypes": [{ "id": "model" }],
              "presentationFields": [
                { "id": "Navn", "path": "Soknad.navn", "dataTypeId": "typo-model", "DataTypeId": "model" }
              ]
            }
            """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Case_Only_Duplicate_Property_Names_Still_Report_A_Real_Typo()
    {
        // The mirror of the case above: the winning value is the bad one, so the warning must fire.
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "dataTypes": [{ "id": "model" }],
              "presentationFields": [
                { "id": "Navn", "path": "Soknad.navn", "DataTypeId": "model", "dataTypeId": "typo-model" }
              ]
            }
            """
        );

        var unknown = Assert.Single(diagnostics, d => d.Id == Diagnostics.Metadata.UnknownFieldDataType.Id);
        Assert.Contains("'typo-model'", unknown.GetMessage(), StringComparison.Ordinal);
    }

    [Fact]
    public void Case_Only_Duplicate_Ids_Collide_On_The_Winning_Value()
    {
        // Both entries resolve to id 'Navn' on 'model' once last-one-wins is applied, so this is the
        // crashing shape even though no two spellings match.
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "dataTypes": [{ "id": "model" }],
              "presentationFields": [
                { "Id": "Other", "id": "Navn", "path": "Soknad.a", "dataTypeId": "model" },
                { "id": "Navn", "path": "Soknad.b", "dataTypeId": "model" }
              ]
            }
            """
        );

        Assert.Single(diagnostics, d => d.Id == Diagnostics.Metadata.DuplicateFieldId.Id);
    }

    [Fact]
    public async Task Unknown_DataTypeId_Emits_Warning()
    {
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "dataTypes": [{ "id": "model" }],
              "presentationFields": [
                { "id": "Navn", "path": "Soknad.navn", "dataTypeId": "typo-model" }
              ]
            }
            """
        );

        var unknown = Assert.Single(diagnostics, d => d.Id == Diagnostics.Metadata.UnknownFieldDataType.Id);
        Assert.Equal(DiagnosticSeverity.Warning, unknown.Severity);
        await Verify(diagnostics);
    }

    [Fact]
    public void Unique_Ids_On_Declared_Data_Types_Emit_Nothing()
    {
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "dataTypes": [{ "id": "model" }, { "id": "ref-data-as-pdf" }],
              "presentationFields": [
                { "id": "Navn", "path": "Soknad.navn", "dataTypeId": "model" },
                { "id": "Adresse", "path": "Soknad.adresse", "dataTypeId": "model" }
              ],
              "dataFields": [
                { "id": "Navn", "path": "Soknad.navn", "dataTypeId": "model" }
              ]
            }
            """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Absent_Collections_Emit_Nothing()
    {
        Assert.Empty(Collect("""{ "id": "ttd/app", "dataTypes": [{ "id": "model" }] }"""));
    }

    [Fact]
    public void Entry_Without_An_Id_Is_Left_To_Other_Rules()
    {
        var diagnostics = Collect(
            """
            {
              "id": "ttd/app",
              "dataTypes": [{ "id": "model" }],
              "presentationFields": [
                { "path": "Soknad.navn", "dataTypeId": "model" },
                { "path": "Soknad.adresse", "dataTypeId": "model" }
              ]
            }
            """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void Malformed_Json_Does_Not_Throw_And_Emits_Nothing()
    {
        Assert.Empty(Collect("{ this is not valid json "));
    }

    [Fact]
    public void Collection_That_Is_Not_An_Array_Emits_Nothing()
    {
        Assert.Empty(Collect("""{ "id": "ttd/app", "presentationFields": { "id": "Navn" } }"""));
    }
}

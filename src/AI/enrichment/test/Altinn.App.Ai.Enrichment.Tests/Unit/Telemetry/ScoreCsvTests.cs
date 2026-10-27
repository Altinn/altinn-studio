#if NET10_0_OR_GREATER
using Altinn.App.Ai.Enrichment.ScoreImport;
using FluentAssertions;

namespace Altinn.App.Ai.Enrichment.Tests.Unit.Telemetry;

/// <summary>
/// The import file is exported by hand from a spreadsheet, so the cases that matter
/// are the ones a person actually produces: Norwegian Excel's semicolons and decimal
/// commas, Norwegian words for yes and no, and commas inside a comment.
/// </summary>
public class ScoreCsvTests
{
    [Fact]
    public void Read_CommaSeparated_ParsesEveryColumn()
    {
        var rows = ScoreCsv.Read([
            "instanceId,value,comment",
            "ttd/klage/50012345/0195c0de,1,Verdikt korrekt",
        ]).ToList();

        rows.Should().ContainSingle();
        rows[0].InstanceId.Should().Be("ttd/klage/50012345/0195c0de");
        rows[0].Value.Should().Be(1);
        rows[0].Comment.Should().Be("Verdikt korrekt");
    }

    [Fact]
    public void Read_NorwegianExcelDialect_HandlesSemicolonsAndDecimalComma()
    {
        var rows = ScoreCsv.Read([
            "instanceId;value;comment",
            "ttd/klage/1/a;0,75;Delvis riktig",
        ]).ToList();

        rows[0].Value.Should().Be(0.75);
        rows[0].Comment.Should().Be("Delvis riktig");
    }

    [Theory]
    [InlineData("ja", 1)]
    [InlineData("Nei", 0)]
    [InlineData("true", 1)]
    [InlineData("FALSE", 0)]
    [InlineData("korrekt", 1)]
    [InlineData("feil", 0)]
    [InlineData("3", 3)]
    public void Read_AcceptsTheWordsPeopleActuallyType(string raw, double expected)
    {
        var rows = ScoreCsv.Read(["instanceId,value", $"i,{raw}"]).ToList();

        rows[0].Value.Should().Be(expected);
    }

    [Fact]
    public void Read_QuotedCommentContainingSeparator_StaysOneField()
    {
        var rows = ScoreCsv.Read([
            "instanceId,value,comment",
            """i,1,"Riktig, men så vidt" """.TrimEnd(),
        ]).ToList();

        rows[0].Comment.Should().Be("Riktig, men så vidt");
    }

    [Fact]
    public void Read_MissingHeader_ComplainsRatherThanEatingTheFirstRow()
    {
        var act = () => ScoreCsv.Read(["ttd/klage/1/a,1"]).ToList();

        act.Should().Throw<FormatException>().WithMessage("*expected a header row*");
    }

    [Fact]
    public void Read_UnparseableValue_NamesTheLine()
    {
        var act = () => ScoreCsv.Read(["instanceId,value", "i,1", "j,kanskje"]).ToList();

        act.Should().Throw<FormatException>().WithMessage("*Line 3*kanskje*");
    }

    [Fact]
    public void DeterministicScoreId_IsStablePerSubmissionAndTrace()
    {
        // This is what makes re-importing a corrected spreadsheet overwrite the earlier
        // verdict rather than leaving two contradictory scores on the same trace.
        var first = ScoreCsv.DeterministicScoreId("ttd/klage/1/a", "saksbehandler_vurdering", "trace-1");
        var again = ScoreCsv.DeterministicScoreId("ttd/klage/1/a", "saksbehandler_vurdering", "trace-1");
        var otherTrace = ScoreCsv.DeterministicScoreId("ttd/klage/1/a", "saksbehandler_vurdering", "trace-2");

        again.Should().Be(first);
        otherTrace.Should().NotBe(first);

        // Instance ids contain '/', and the id is used in a URL path.
        first.Should().MatchRegex("^import-[0-9a-f]{32}$");
    }
}
#endif

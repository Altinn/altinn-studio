using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Models;

namespace Altinn.App.Core.Tests.Eformidling.Implementation;

public class EFormidlingStatusReaderTests
{
    private static Statuses StatusList(string statuses) =>
        new()
        {
            Content = statuses
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(status => new Statuses.Entry { Status = status })
                .ToList(),
        };

    [Theory]
    [InlineData("", EFormidlingDeliveryState.Pending)]
    [InlineData("opprettet", EFormidlingDeliveryState.Pending)]
    [InlineData("opprettet,sendt", EFormidlingDeliveryState.Pending)]
    [InlineData("opprettet,sendt,mottatt", EFormidlingDeliveryState.Pending)]
    [InlineData("opprettet,sendt,levert", EFormidlingDeliveryState.Delivered)]
    [InlineData("lest", EFormidlingDeliveryState.Delivered)]
    [InlineData("feil", EFormidlingDeliveryState.Failed)]
    [InlineData("levetid_utlopt", EFormidlingDeliveryState.Failed)]
    public void Classify_maps_the_integrasjonspunkt_vocabulary(string statuses, EFormidlingDeliveryState expected)
    {
        Assert.Equal(expected, EFormidlingStatusReader.Classify(StatusList(statuses)).State);
    }

    [Theory]
    [InlineData("LEVERT")]
    [InlineData("Lest")]
    public void Classify_matches_status_values_case_insensitively(string status)
    {
        // The values seen in production are lower case, but the API promises nothing.
        Assert.Equal(EFormidlingDeliveryState.Delivered, EFormidlingStatusReader.Classify(StatusList(status)).State);
    }

    [Fact]
    public void Classify_prefers_delivery_over_a_recorded_failure()
    {
        // A shipment that recorded an error and was delivered anyway has been delivered - the
        // legacy status-check handler judged it the same way.
        var status = EFormidlingStatusReader.Classify(StatusList("feil,levert"));

        Assert.Equal(EFormidlingDeliveryState.Delivered, status.State);
        Assert.Equal("levert", status.Status);
    }

    [Fact]
    public void Classify_reports_the_entry_that_decided_a_terminal_state()
    {
        Statuses statuses = new()
        {
            Content =
            [
                new Statuses.Entry { Status = "opprettet" },
                new Statuses.Entry { Status = "feil", Description = "Mottaker er ikke registrert" },
            ],
        };

        var status = EFormidlingStatusReader.Classify(statuses);

        Assert.Equal(EFormidlingDeliveryState.Failed, status.State);
        Assert.Equal("feil", status.Status);
        Assert.Equal("Mottaker er ikke registrert", status.Description);
    }

    [Fact]
    public void Classify_reports_the_last_entry_as_a_progress_note_while_pending()
    {
        var status = EFormidlingStatusReader.Classify(StatusList("opprettet,sendt"));

        Assert.Equal(EFormidlingDeliveryState.Pending, status.State);
        Assert.Equal("sendt", status.Status);
    }

    [Fact]
    public void Classify_treats_an_absent_status_list_as_pending()
    {
        // The integrasjonspunkt may not know the message yet, in which case it reports a page whose
        // content list is absent entirely.
        Assert.Equal(EFormidlingDeliveryState.Pending, EFormidlingStatusReader.Classify(new Statuses()).State);
    }

    [Fact]
    public void Classify_tolerates_entries_without_a_status_value()
    {
        Statuses statuses = new() { Content = [new Statuses.Entry(), new Statuses.Entry { Status = "levert" }] };

        Assert.Equal(EFormidlingDeliveryState.Delivered, EFormidlingStatusReader.Classify(statuses).State);
    }

    [Theory]
    [InlineData("", false)]
    [InlineData("opprettet", false)]
    [InlineData("opprettet,sendt", true)]
    [InlineData("mottatt", true)]
    [InlineData("levert", true)]
    [InlineData("lest", true)]
    public void HasLeftOutbox_is_true_for_any_status_beyond_creation(string statuses, bool expected)
    {
        Assert.Equal(expected, EFormidlingStatusReader.HasLeftOutbox(StatusList(statuses)));
    }

    [Fact]
    public void HasLeftOutbox_treats_an_absent_status_list_as_still_in_the_outbox()
    {
        Assert.False(EFormidlingStatusReader.HasLeftOutbox(new Statuses()));
    }
}

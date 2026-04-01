using Altinn.App.Core.Features.Notifications.Texts;
using Altinn.App.Core.Internal.Language;

namespace Altinn.App.Core.Tests.Features.Notifications.Texts;

public class NotificationTextsTests
{
    #region ReplaceTokens

    [Fact]
    public void ReplaceTokens_AllTokens_ReplacesAll()
    {
        string text =
            "App: $appName$, Owner: $instanceOwnerName$, Service: $serviceOwnerName$, Org: $orgNumber$, NIN: $personNumber$, Due: $dueDate$";

        string result = NotificationTexts.ReplaceTokens(
            text,
            appId: "ttd/app-test",
            title: "skattemelding",
            instanceOwnerName: "John Doe",
            serviceOwnerName: "TestDepartementet",
            orgNumber: "123456789",
            nationalIndentityNumber: "01010112345",
            dueDateTime: DateTime.SpecifyKind(new DateTime(2024, 12, 31), DateTimeKind.Utc)
        );

        Assert.Equal(
            "App: skattemelding, Owner: John Doe, Service: TestDepartementet, Org: 123456789, NIN: 01010112345, Due: 31-12-2024 01:00:00",
            result
        );
    }

    [Fact]
    public void ReplaceTokens_NullValues_ReplacesWithEmptyStrings()
    {
        string text =
            "App: $appName$, Owner: $instanceOwnerName$, Service: $serviceOwnerName$, Org: $orgNumber$, NIN: $personNumber$, Due: $dueDate$";

        string result = NotificationTexts.ReplaceTokens(
            text,
            appId: null,
            title: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            orgNumber: null,
            nationalIndentityNumber: null,
            dueDateTime: null
        );

        Assert.Equal("App: , Owner: , Service: , Org: , NIN: , Due: ", result);
    }

    [Fact]
    public void ReplaceTokens_AppIdWithoutSlash_AppNameIsEmpty()
    {
        string result = NotificationTexts.ReplaceTokens(
            "App: $appName$",
            appId: "invalid-no-slash",
            title: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            orgNumber: null,
            nationalIndentityNumber: null,
            dueDateTime: null
        );

        Assert.Equal("App: ", result);
    }

    [Fact]
    public void ReplaceTokens_AppIdWithMultipleSegments_UsesSecondSegmentAsAppName()
    {
        string result = NotificationTexts.ReplaceTokens(
            "App: $appName$",
            appId: "org/app-name/extra",
            title: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            orgNumber: null,
            nationalIndentityNumber: null,
            dueDateTime: null
        );

        Assert.Equal("App: app-name", result);
    }

    [Fact]
    public void ReplaceTokens_DueDate_Format()
    {
        string result = NotificationTexts.ReplaceTokens(
            "$dueDate$",
            appId: null,
            title: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            orgNumber: null,
            nationalIndentityNumber: null,
            dueDateTime: DateTime.SpecifyKind(new DateTime(2026, 3, 12, 16, 15, 44), DateTimeKind.Utc)
        );

        Assert.Equal("12-03-2026 17:15:44", result);
    }

    [Fact]
    public void ReplaceTokens_TextWithNoTokens_ReturnsUnchanged()
    {
        const string text = "No tokens here.";

        string result = NotificationTexts.ReplaceTokens(
            text,
            appId: "ttd/app",
            title: null,
            instanceOwnerName: "Someone",
            serviceOwnerName: "Owner",
            orgNumber: "999",
            nationalIndentityNumber: "12345",
            dueDateTime: DateTime.SpecifyKind(new DateTime(2024, 6, 1), DateTimeKind.Utc)
        );

        Assert.Equal(text, result);
    }

    #endregion

    #region GetDefaultSubject

    [Theory]
    [InlineData(LanguageConst.En, "New form created in Altinn")]
    [InlineData(LanguageConst.Nn, "Nytt skjema opprettet i Altinn")]
    [InlineData(LanguageConst.Nb, "Nytt skjema opprettet i Altinn")]
    [InlineData(null, "Nytt skjema opprettet i Altinn")]
    [InlineData("unknown-language", "Nytt skjema opprettet i Altinn")]
    public void GetDefaultSubject_ReturnsExpectedSubject(string? language, string expected)
    {
        Assert.Equal(expected, NotificationTexts.GetDefaultSubject(language));
    }

    #endregion

    #region GetDefaultBody

    [Theory]
    [InlineData(LanguageConst.En, "A new form has been created - open your Altinn inbox to view the form.")]
    [InlineData(LanguageConst.Nn, "Eit nytt skjema har blitt opprettet - opne innboksen i Altinn for å sjå skjemaet.")]
    [InlineData(
        LanguageConst.Nb,
        "Det har blitt opprettet et nytt skjema - åpne innboksen i Altinn for å se skjemaet."
    )]
    [InlineData(null, "Det har blitt opprettet et nytt skjema - åpne innboksen i Altinn for å se skjemaet.")]
    public void GetDefaultBody_NoParameters_ReturnsBaseMessage(string? language, string expected)
    {
        string result = NotificationTexts.GetDefaultBody(
            language,
            appid: null,
            serviceOwnerName: null,
            instanceOwnerName: null,
            orgNumber: null,
            nationalIndentityNumber: null,
            dueDate: null
        );

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(LanguageConst.En, "Acme has created a new form - open your Altinn inbox to view the form.")]
    [InlineData(LanguageConst.Nn, "Acme har opprettet eit nytt skjema - opne innboksen i Altinn for å sjå skjemaet.")]
    [InlineData(LanguageConst.Nb, "Acme har opprettet et nytt skjema - åpne innboksen i Altinn for å se skjemaet.")]
    [InlineData(null, "Acme har opprettet et nytt skjema - åpne innboksen i Altinn for å se skjemaet.")]
    public void GetDefaultBody_WithServiceOwner_IncludesOwnerName(string? language, string expected)
    {
        string result = NotificationTexts.GetDefaultBody(
            language,
            appid: null,
            serviceOwnerName: "Acme",
            instanceOwnerName: null,
            orgNumber: null,
            nationalIndentityNumber: null,
            dueDate: null
        );

        Assert.Equal(expected, result);
    }

    [Fact]
    public void GetDefaultBody_WithAppId_IncludesAppNameInParentheses()
    {
        string result = NotificationTexts.GetDefaultBody(
            LanguageConst.En,
            appid: "ttd/my-app",
            serviceOwnerName: null,
            instanceOwnerName: null,
            orgNumber: null,
            nationalIndentityNumber: null,
            dueDate: null
        );

        Assert.Equal("A new form has been created (my-app) - open your Altinn inbox to view the form.", result);
    }

    [Fact]
    public void GetDefaultBody_WithInstanceOwnerName_IncludesForClause()
    {
        string result = NotificationTexts.GetDefaultBody(
            LanguageConst.En,
            appid: null,
            serviceOwnerName: null,
            instanceOwnerName: "John Doe",
            orgNumber: null,
            nationalIndentityNumber: null,
            dueDate: null
        );

        Assert.Equal("A new form has been created for John Doe - open your Altinn inbox to view the form.", result);
    }

    [Fact]
    public void GetDefaultBody_WithOrgNumber_AndInstanceOwnerName_IncludesOrgNumber()
    {
        string result = NotificationTexts.GetDefaultBody(
            LanguageConst.En,
            appid: null,
            serviceOwnerName: null,
            instanceOwnerName: "Acme AS",
            orgNumber: "123456789",
            nationalIndentityNumber: null,
            dueDate: null
        );

        Assert.Equal(
            "A new form has been created for Acme AS with organization number 123456789 - open your Altinn inbox to view the form.",
            result
        );
    }

    [Fact]
    public void GetDefaultBody_WithOrgNumber_NoInstanceOwnerName_IncludesAvgiverPrefix_Nn()
    {
        string result = NotificationTexts.GetDefaultBody(
            LanguageConst.Nn,
            appid: null,
            serviceOwnerName: null,
            instanceOwnerName: null,
            orgNumber: "123456789",
            nationalIndentityNumber: null,
            dueDate: null
        );

        Assert.Equal(
            "Eit nytt skjema har blitt opprettet avgiver med organisasjonsnummer 123456789 - opne innboksen i Altinn for å sjå skjemaet.",
            result
        );
    }

    [Fact]
    public void GetDefaultBody_WithSocialSecurityNumber_AndNoOrgNumber_IncludesSsn()
    {
        string result = NotificationTexts.GetDefaultBody(
            LanguageConst.En,
            appid: null,
            serviceOwnerName: null,
            instanceOwnerName: "Jane Doe",
            orgNumber: null,
            nationalIndentityNumber: "01010112345",
            dueDate: null
        );

        Assert.Equal(
            "A new form has been created for Jane Doe with social security number 01010112345 - open your Altinn inbox to view the form.",
            result
        );
    }

    [Fact]
    public void GetDefaultBody_WithSocialSecurityNumber_AndOrgNumber_OmitsSsn()
    {
        // Org number takes precedence; SSN must not appear when org number is also set
        string result = NotificationTexts.GetDefaultBody(
            LanguageConst.En,
            appid: null,
            serviceOwnerName: null,
            instanceOwnerName: null,
            orgNumber: "123456789",
            nationalIndentityNumber: "01010112345",
            dueDate: null
        );

        Assert.DoesNotContain("01010112345", result);
        Assert.Contains("123456789", result);
    }

    [Fact]
    public void GetDefaultBody_WithDueDate_IncludesFormattedDate()
    {
        string result = NotificationTexts.GetDefaultBody(
            LanguageConst.En,
            appid: null,
            serviceOwnerName: null,
            instanceOwnerName: null,
            orgNumber: null,
            nationalIndentityNumber: null,
            dueDate: DateTime.SpecifyKind(new DateTime(2025, 7, 3), DateTimeKind.Utc)
        );

        Assert.Equal(
            "A new form has been created with due date 03-07-2025 - open your Altinn inbox to view the form.",
            result
        );
    }

    [Fact]
    public void GetDefaultBody_WithDueDate_Nn_IncludesFristLabel()
    {
        string result = NotificationTexts.GetDefaultBody(
            LanguageConst.Nn,
            appid: null,
            serviceOwnerName: null,
            instanceOwnerName: null,
            orgNumber: null,
            nationalIndentityNumber: null,
            dueDate: DateTime.SpecifyKind(new DateTime(2025, 7, 3), DateTimeKind.Utc)
        );

        Assert.Equal(
            "Eit nytt skjema har blitt opprettet med frist 03-07-2025 - opne innboksen i Altinn for å sjå skjemaet.",
            result
        );
    }

    [Fact]
    public void GetDefaultBody_AllParameters_En_ProducesFullSentence()
    {
        string result = NotificationTexts.GetDefaultBody(
            LanguageConst.En,
            appid: "ttd/tax-form",
            serviceOwnerName: "Tax Authority",
            instanceOwnerName: "Acme AS",
            orgNumber: "987654321",
            nationalIndentityNumber: null,
            dueDate: DateTime.SpecifyKind(new DateTime(2025, 12, 31), DateTimeKind.Utc)
        );

        Assert.Equal(
            "Tax Authority has created a new form (tax-form) for Acme AS with organization number 987654321 with due date 31-12-2025 - open your Altinn inbox to view the form.",
            result
        );
    }

    [Fact]
    public void GetDefaultBody_AllParameters_Nb_ProducesFullSentence()
    {
        string result = NotificationTexts.GetDefaultBody(
            LanguageConst.Nb,
            appid: "ttd/tax-form",
            serviceOwnerName: "Skatteetaten",
            instanceOwnerName: "Acme AS",
            orgNumber: "987654321",
            nationalIndentityNumber: null,
            dueDate: DateTime.SpecifyKind(new DateTime(2025, 12, 31), DateTimeKind.Utc)
        );

        Assert.Equal(
            "Skatteetaten har opprettet et nytt skjema (tax-form) for Acme AS med organisasjonsnummer 987654321 med frist 31-12-2025 - åpne innboksen i Altinn for å se skjemaet.",
            result
        );
    }

    #endregion

    #region GetPrintableTime

    [Fact]
    public void GetPrintableTime_Null_ReturnsNull()
    {
        Assert.Null(NotificationTexts.GetPrintableDateTime(null));
    }

    [Fact]
    public void GetPrintableTime_WinterTime_ConvertsToOslo()
    {
        // UTC+1 in winter (CET)
        var result = NotificationTexts.GetPrintableDateTime(
            DateTime.SpecifyKind(new DateTime(2026, 3, 12, 16, 15, 44), DateTimeKind.Utc)
        );
        Assert.Equal("12-03-2026 17:15:44", result);
    }

    [Fact]
    public void GetPrintableTime_SummerTime_ConvertsToOslo()
    {
        // UTC+2 in summer (CEST)
        var result = NotificationTexts.GetPrintableDateTime(
            DateTime.SpecifyKind(new DateTime(2025, 7, 1, 14, 0, 0), DateTimeKind.Utc)
        );
        Assert.Equal("01-07-2025 16:00:00", result);
    }

    [Fact]
    public void GetPrintableTime_UnspecifiedKind_TreatedAsUtc()
    {
        var unspecified = new DateTime(2025, 6, 15, 10, 0, 0);
        var utc = DateTime.SpecifyKind(new DateTime(2025, 6, 15, 10, 0, 0), DateTimeKind.Utc);
        Assert.Equal(NotificationTexts.GetPrintableDateTime(utc), NotificationTexts.GetPrintableDateTime(unspecified));
    }

    #endregion

    #region Metadata title

    [Fact]
    public void ReplaceTokens_WithTitle_UsesTitleOverAppName()
    {
        string result = NotificationTexts.ReplaceTokens(
            "$appName$",
            appId: "ttd/my-app",
            title: "My Application Title",
            instanceOwnerName: null,
            serviceOwnerName: null,
            orgNumber: null,
            nationalIndentityNumber: null,
            dueDateTime: null
        );

        Assert.Equal("My Application Title", result);
    }

    [Fact]
    public void ReplaceTokens_NullTitleAndNullAppId_ReplacesWithEmptyString()
    {
        string result = NotificationTexts.ReplaceTokens(
            "$appName$",
            appId: null,
            title: null,
            instanceOwnerName: null,
            serviceOwnerName: null,
            orgNumber: null,
            nationalIndentityNumber: null,
            dueDateTime: null
        );

        Assert.Equal("", result);
    }

    [Fact]
    public void ReplaceTokens_AllTokens_WithTitle_UsesTitleForAppName()
    {
        string text =
            "App: $appName$, Owner: $instanceOwnerName$, Service: $serviceOwnerName$, Org: $orgNumber$, NIN: $personNumber$, Due: $dueDate$";

        string result = NotificationTexts.ReplaceTokens(
            text,
            appId: "ttd/app-test",
            title: "Utenriksøkonomi (RA-0532)",
            instanceOwnerName: "John Doe",
            serviceOwnerName: "TestDepartementet",
            orgNumber: "123456789",
            nationalIndentityNumber: "01010112345",
            dueDateTime: DateTime.SpecifyKind(new DateTime(2024, 12, 31), DateTimeKind.Utc)
        );

        Assert.Equal(
            "App: Utenriksøkonomi (RA-0532), Owner: John Doe, Service: TestDepartementet, Org: 123456789, NIN: 01010112345, Due: 31-12-2024 01:00:00",
            result
        );
    }

    #endregion
}

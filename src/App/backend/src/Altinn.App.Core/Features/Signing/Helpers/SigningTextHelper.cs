using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.Language;

namespace Altinn.App.Core.Features.Signing.Helpers;

internal sealed class SigningTextHelper
{
    internal static string GetLinkDisplayText(string language)
    {
        return language switch
        {
            LanguageConst.Nn => "Klikk her for å opne skjema",
            LanguageConst.En => "Click here to open the form",
            LanguageConst.Nb => "Klikk her for å åpne skjema",
            _ => "Klikk her for å åpne skjema",
        };
    }

    /// <summary>
    /// Gets the default texts for the given language.
    /// </summary>
    /// <param name="instanceUrl">The url for the instance</param>
    /// <param name="language">The language to get the texts for</param>
    /// <param name="appName">The name of the app</param>
    /// <param name="appOwner">The owner of the app</param>
    internal static DefaultTexts GetDefaultTexts(string instanceUrl, string language, string appName, string appOwner)
    {
        return language switch
        {
            LanguageConst.En => new DefaultTexts
            {
                Title = $"{appName}: Task for signing",
                Summary = $"Your signature is requested for {appName}.",
                Body =
                    $"You have a task waiting for your signature. [{GetLinkDisplayText(LanguageConst.En)}]({instanceUrl})\n\nIf you have any questions, you can contact {appOwner}.",
                SmsBody = $"Your signature is requested for {appName}. Open your Altinn inbox to proceed.",
                EmailSubject = $"{appName}: Task for signing",
                EmailBody =
                    $"Your signature is requested for {appName}. Open your Altinn inbox to proceed.\n\nIf you have any questions, you can contact {appOwner}.",
                ReminderSmsBody =
                    $"Reminder: Your signature is requested for {appName}. Open your Altinn inbox to proceed.",
                ReminderEmailSubject = $"{appName}: Reminder for task for signing",
                ReminderEmailBody =
                    $"Reminder: Your signature is requested for {appName}. Open your Altinn inbox to proceed.\n\nIf you have any questions, you can contact {appOwner}.",
            },
            LanguageConst.Nn => new DefaultTexts
            {
                Title = $"{appName}: Oppgåve til signering",
                Summary = $"Signaturen din vert venta for {appName}.",
                Body =
                    $"Du har ei oppgåve som ventar på signaturen din. [{GetLinkDisplayText(LanguageConst.Nn)}]({instanceUrl})\n\nOm du lurer på noko, kan du kontakte {appOwner}.",
                SmsBody = $"Signaturen din vert venta for {appName}. Opne Altinn-innboksen din for å gå vidare.",
                EmailSubject = $"{appName}: Oppgåve til signering",
                EmailBody =
                    $"Signaturen din vert venta for {appName}. Opne Altinn-innboksen din for å gå vidare.\n\nOm du lurer på noko, kan du kontakte {appOwner}.",
                ReminderSmsBody =
                    $"Påminning: Signaturen din vert venta for {appName}. Opne Altinn-innboksen din for å gå vidare.",
                ReminderEmailSubject = $"{appName}: Påminning om oppgåve til signering",
                ReminderEmailBody =
                    $"Påminning: Signaturen din vert venta for {appName}. Opne Altinn-innboksen din for å gå vidare.\n\nOm du lurer på noko, kan du kontakte {appOwner}.",
            },
            LanguageConst.Nb or _ => new DefaultTexts
            {
                Title = $"{appName}: Oppgave til signering",
                Summary = $"Din signatur ventes for {appName}.",
                Body =
                    $"Du har en oppgave som venter på din signatur. [{GetLinkDisplayText(LanguageConst.Nb)}]({instanceUrl})\n\nHvis du lurer på noe, kan du kontakte {appOwner}.",
                SmsBody = $"Din signatur ventes for {appName}. Åpne Altinn-innboksen din for å fortsette.",
                EmailSubject = $"{appName}: Oppgave til signering",
                EmailBody =
                    $"Din signatur ventes for {appName}. Åpne Altinn-innboksen din for å fortsette.\n\nHvis du lurer på noe, kan du kontakte {appOwner}.",
                ReminderSmsBody =
                    $"Påminnelse: Din signatur ventes for {appName}. Åpne Altinn-innboksen din for å fortsette.",
                ReminderEmailSubject = $"{appName}: Påminnelse om oppgave til signering",
                ReminderEmailBody =
                    $"Påminnelse: Din signatur ventes for {appName}. Åpne Altinn-innboksen din for å fortsette.\n\nHvis du lurer på noe, kan du kontakte {appOwner}.",
            },
        };
    }
}

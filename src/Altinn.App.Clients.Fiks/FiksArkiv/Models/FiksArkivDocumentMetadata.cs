namespace Altinn.App.Clients.Fiks.FiksArkiv.Models;

/// <summary>
/// Metadata information for an archive document (arkivmelding.xml).
/// </summary>
/// <param name="SystemId">The System identifier (XML tag: system)</param>
/// <param name="RuleId">The document's rule identifier (XML tag: regel)</param>
/// <param name="CaseFileId">The case file's identifier (XML tag: mappe->referanseEksternNoekkel->noekkel)</param>
/// <param name="CaseFileTitle">The case file's title (XML tag: mappe->tittel)</param>
/// <param name="JournalEntryTitle">The journal entry's title (XML tag: registrering->tittel)</param>
public sealed record FiksArkivDocumentMetadata(
    string? SystemId,
    string? RuleId,
    string? CaseFileId,
    string? CaseFileTitle,
    string? JournalEntryTitle
);

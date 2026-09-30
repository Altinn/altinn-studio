namespace Altinn.App.Core.Features.Options.Altinn3LibraryCodeList;

/// <summary>
/// A code list in the Altinn 3 code list library, either parsed from a <c>lib**{org}**{codeListId}**{version}</c>
/// reference or registered under an id with
/// <see cref="CommonOptionProviderServiceCollectionExtensions.AddAltinn3CodeList"/>.
/// </summary>
/// <param name="Id">The id the list is looked up by</param>
/// <param name="Org">The organization that owns the code list</param>
/// <param name="CodeListId">The id of the code list in the library</param>
/// <param name="Version">The version of the code list, or null for the latest</param>
internal sealed record LibraryCodeListDefinition(string Id, string Org, string CodeListId, string? Version);

using Altinn.App.Clients.Fiks.FiksArkiv.Models;

namespace Altinn.App.Clients.Fiks.Extensions;

internal static class ListExtensions
{
    /// <summary>
    /// Ensures that all filenames in the list of attachments are unique by appending a unique identifier to duplicates.
    /// </summary>
    public static void EnsureUniqueFilenames(this IReadOnlyList<MessagePayloadWrapper> attachments)
    {
        var hasDuplicateFilenames = attachments
            .GroupBy(x => x.Payload.Filename.ToLowerInvariant())
            .Where(x => x.Count() > 1)
            .Select(x => x.ToList());

        foreach (var duplicates in hasDuplicateFilenames)
        {
            int uniqueId = 0;
            foreach (var dupe in duplicates)
            {
                uniqueId++;
                string filename = Path.GetFileNameWithoutExtension(dupe.Payload.Filename);
                string extension = Path.GetExtension(dupe.Payload.Filename);
                string proposedFilename = FormatFilename(filename, extension, uniqueId);

                // Ensure that the new filename is unique within the entire attachments list
                while (
                    attachments.Any(a =>
                        a.Payload.Filename.Equals(proposedFilename, StringComparison.OrdinalIgnoreCase)
                    )
                )
                {
                    uniqueId++;
                    proposedFilename = FormatFilename(filename, extension, uniqueId);
                }

                dupe.Payload.Filename = proposedFilename;
            }
        }
    }

    private static string FormatFilename(string filenameBase, string extension, int? id) =>
        id is null ? $"{filenameBase}{extension}" : $"{filenameBase}({id}){extension}";
}

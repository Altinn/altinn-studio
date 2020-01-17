using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;

using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Helpers.Extensions
{
    /// <summary>
    /// The zip archive extensions.
    /// </summary>
    public static class ZipArchiveExtensions
    {
        /// <summary>
        /// The deserialize first file named.
        /// </summary>
        /// <param name="zipArchive">
        /// The zip archive.
        /// </param>
        /// <param name="filename">
        /// The filename.
        /// </param>
        /// <param name="comparison">
        /// The comparison.
        /// </param>
        /// <typeparam name="T">Any object that should be deserialized. </typeparam>
        /// <returns>
        /// The object of type T.
        /// </returns>
        /// <exception cref="ArgumentException"> File not found in archive.
        /// </exception>
        public static T DeserializeFirstFileNamed<T>(this ZipArchive zipArchive, string filename, StringComparison comparison = StringComparison.CurrentCulture)
        {
            var raw = ReadAllTextOfFirstFileNamed(zipArchive, filename, comparison);
            var result = JsonConvert.DeserializeObject<T>(raw);
            return result;
        }

        /// <summary>
        /// The deserialize all entries from zip archive as generic type T.
        /// </summary>
        /// <param name="entries">
        /// The zip archive entries.
        /// </param>
        /// <typeparam name="T">The type
        /// </typeparam>
        /// <returns>
        /// The list of deserialized objects
        /// </returns>
        public static IEnumerable<T> DeserializeAllAs<T>(this IEnumerable<ZipArchiveEntry> entries)
        {
            Guard.AssertArgumentNotNull(entries, nameof(entries));
            return entries
                .Select(ReadAllTextOffZipEntry)
                .Select(JsonConvert.DeserializeObject<T>);
        }

        /// <summary>
        /// The read all text of first file named.
        /// </summary>
        /// <param name="zipArchive">
        /// The zip archive.
        /// </param>
        /// <param name="filename">
        /// The filename.
        /// </param>
        /// <param name="comparison">
        /// The comparison.
        /// </param>
        /// <returns>
        /// The <see cref="string"/>.
        /// </returns>
        public static string ReadAllTextOfFirstFileNamed(this ZipArchive zipArchive, string filename, StringComparison comparison = StringComparison.CurrentCulture)
        {
            Guard.AssertArgumentNotNull(zipArchive, nameof(zipArchive));
            Guard.AssertArgumentNotNullOrWhiteSpace(filename, nameof(filename));

            var file = zipArchive.Entries.FirstOrDefault(e => filename.Equals(e?.Name, comparison));
            if (file == null)
            {
                throw new ArgumentException("File name not found in zip archive", nameof(filename));
            }

            return ReadAllTextOffZipEntry(file);
        }

        /// <summary>
        /// The read all text off zip entry.
        /// </summary>
        /// <param name="zipArchiveEntry">
        /// The zip archive entry.
        /// </param>
        /// <returns>
        /// The <see cref="string"/>.
        /// </returns>
        public static string ReadAllTextOffZipEntry(this ZipArchiveEntry zipArchiveEntry)
        {
            Guard.AssertArgumentNotNull(zipArchiveEntry, nameof(zipArchiveEntry));
            using (var s = zipArchiveEntry.Open())
            using (var sr = new StreamReader(s))
            {
                return sr.ReadToEnd();
            }
        }
    }
}

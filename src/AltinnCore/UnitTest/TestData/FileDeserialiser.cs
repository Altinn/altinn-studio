using System;
using System.IO;

using Newtonsoft.Json;

namespace AltinnCore.UnitTest.TestData
{
    /// <summary>
    /// Represents methods for reading a file and deserialising it to a given type.
    /// </summary>
    internal static class FileDeserialiser
    {
        /// <summary>
        /// Deserialise a file into the given type.
        /// </summary>
        /// <typeparam name="T">The type to deserialise into</typeparam>
        /// <returns></returns>
        public static T DeserialiseFile<T>(string filePath)
            where T : new()
        {
            return JsonConvert.DeserializeObject<T>(File.ReadAllText(filePath));
        }
    }
}

using System.IO;
using System.Text;
using Newtonsoft.Json;

namespace AltinnCore.Designer.Infrastructure.Extensions
{
    /// <summary>
    /// Contains extensions for byte[]
    /// </summary>
    public static class ByteArrayExtensions
    {
        /// <summary>
        /// Deserializes a byte[] into T
        /// </summary>
        /// <typeparam name="T">type to deserialize byte[] to</typeparam>
        /// <param name="data">byte[]</param>
        /// <returns>Deserialized T</returns>
        public static T Deserialize<T>(this byte[] data)
            where T : class
        {
            using MemoryStream stream = new MemoryStream(data);
            using StreamReader reader = new StreamReader(stream, Encoding.UTF8);
            return JsonSerializer.Create().Deserialize(reader, typeof(T)) as T;
        }
    }
}

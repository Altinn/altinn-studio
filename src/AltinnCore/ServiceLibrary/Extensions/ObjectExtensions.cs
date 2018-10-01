using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Xml;
using System.Xml.Serialization;

namespace AltinnCore.ServiceLibrary.Extensions
{
    /// <summary>
    /// Class containing extension methods for the object-type
    /// </summary>
    public static class ObjectExtensions
    {
        /// <summary>
        ///     Checks whether the string is empty or not
        /// </summary>
        /// <param name="str">
        ///     String that needs to be checked
        /// </param>
        /// <returns>
        ///     True if its null or empty
        /// </returns>
        public static bool AsBool(this string str)
        {
            if (string.IsNullOrEmpty(str))
            {
                return false;
            }

            str = str.ToLower();
            return str == "1" || str == "true" || str == "yes" || str == "ja" || str == "j" || str == "y";
        }

        /// <summary>
        ///     Parses string as integer
        /// </summary>
        /// <param name="str">
        ///     String data
        /// </param>
        /// <returns>
        ///     String as integer
        /// </returns>
        public static int AsInt(this string str)
        {
            if (string.IsNullOrEmpty(str))
            {
                return 0;
            }

            checked
            {
                int value;
                int.TryParse(str, out value);
                return value;
            }
        }

        /// <summary>
        ///     Creates an object represented by the provided XML
        /// </summary>
        /// <typeparam name="T">
        ///     {Object} to convert to
        /// </typeparam>
        /// <param name="xmlSerializedObject">
        ///     XML deserialized into an Object
        /// </param>
        /// <returns>
        ///     Deserialized object
        /// </returns>
        public static T DeserializeTo<T>(this string xmlSerializedObject) where T : new()
        {
            using (XmlReader xmlReader = XmlReader.Create(new StringReader(xmlSerializedObject.TrimStart())))
            {
                XmlSerializer ser = new XmlSerializer(typeof(T));
                T obj = (T)ser.Deserialize(xmlReader);
                return obj;
            }
        }

        /// <summary>
        ///     Creates XML of an object
        /// </summary>
        /// <param name="obj">
        ///     This object
        /// </param>
        /// <returns>
        ///     An XML representation of the object
        /// </returns>
        public static string Serialize(this object obj)
        {
            return obj.Serialize(false);
        }

        /// <summary>
        ///     Creates XML of an object
        /// </summary>
        /// <param name="obj">
        ///     This object
        /// </param>
        /// <param name="indent">
        ///     Denotes the use of indent in the xml
        /// </param>
        /// <returns>
        ///     An XML representation of the object
        /// </returns>
        public static string Serialize(this object obj, bool indent)
        {
            XmlSerializer ser = new XmlSerializer(obj.GetType());
            using (MemoryStream memStream = new MemoryStream())
            {
                using (XmlWriter xmlWriter = XmlWriter.Create(memStream, new XmlWriterSettings() { Encoding = Encoding.UTF8, Indent = indent }))
                {
                    ser.Serialize(xmlWriter, obj);
                    ArraySegment<byte> buffer;
                    if (memStream.TryGetBuffer(out buffer))
                    {
                        string xml = Encoding.UTF8.GetString(buffer.Array, 0, (int)memStream.Length);
                        xml = xml.Substring(xml.IndexOf(Convert.ToChar(60)));
                        xml = xml.Substring(0, xml.LastIndexOf(Convert.ToChar(62)) + 1);
                        
                        return xml;
                    }

                    return string.Empty;
                }
            }
        }

        /// <summary>
        ///     Will add new or update existing item in the dictionary
        /// </summary>
        /// <typeparam name="TKey">
        ///     The type of the key.
        /// </typeparam>
        /// <typeparam name="TValue">
        ///     The type of the value.
        /// </typeparam>
        /// <param name="dictionary">
        ///     The dictionary.
        /// </param>
        /// <param name="pair">
        ///     Key Value pair
        /// </param>
        public static void SafeAdd<TKey, TValue>(this IDictionary<TKey, TValue> dictionary, KeyValuePair<TKey, TValue> pair)
        {
            if (dictionary.ContainsKey(pair.Key))
            {
                dictionary[pair.Key] = pair.Value;
            }
            else
            {
                dictionary.Add(pair.Key, pair.Value);
            }
        }

        /// <summary>
        ///     Will add new or update existing item in the dictionary
        /// </summary>
        /// <typeparam name="TKey">
        ///     The type of the key.
        /// </typeparam>
        /// <typeparam name="TValue">
        ///     The type of the value.
        /// </typeparam>
        /// <param name="dictionary">
        ///     The dictionary.
        /// </param>
        /// <param name="key">
        ///     The key.
        /// </param>
        /// <param name="value">
        ///     The value.
        /// </param>
        public static void SafeAdd<TKey, TValue>(this IDictionary<TKey, TValue> dictionary, TKey key, TValue value)
        {
            if (dictionary.ContainsKey(key))
            {
                dictionary[key] = value;
            }
            else
            {
                dictionary.Add(key, value);
            }
        }

        /// <summary>
        ///     Converts first char to lower
        /// </summary>
        /// <param name="str">
        ///     String data
        /// </param>
        /// <returns>
        ///     Lower case
        /// </returns>
        public static string ToFirstCharLower(this string str)
        {
            return str.Substring(0, 1).ToLower() + str.Substring(1);
        }

        /// <summary>
        ///     Checks the string
        /// </summary>
        /// <param name="obj">
        ///     Object details
        /// </param>
        /// <returns>
        ///     Object as string
        /// </returns>
        public static string AsString(this object obj)
        {
            return obj != null ? obj.ToString() : string.Empty;
        }
    }
}
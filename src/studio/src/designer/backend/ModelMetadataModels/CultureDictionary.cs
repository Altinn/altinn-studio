#region Namespace imports

using System;
using System.Collections.Generic;
using System.Xml;
using System.Xml.Schema;
using System.Xml.Serialization;

#endregion

namespace Altinn.Studio.Designer.ModelMetadatalModels
{
    /// <summary>
    /// A dictionary where the values have cultures
    /// </summary>
    public class CultureDictionary : Dictionary<string, CultureString>, IXmlSerializable
    {
        private static XmlSerializer _valueSerializer;

        #region Constructor

        /// <summary>
        /// Initializes a new instance of the <see cref="CultureDictionary"/> class
        /// </summary>
        public CultureDictionary()
        {
        }
        #endregion

        /// <summary>
        /// Gets the value serializer.
        /// </summary>
        private static XmlSerializer ValueSerializer
        {
            get
            {
                return _valueSerializer ?? (_valueSerializer = new XmlSerializer(typeof(CultureString)));
            }
        }

        /// <summary>
        /// This method is reserved and should not be used. When implementing the IXmlSerializable interface, you should return null (Nothing in Visual Basic)
        /// from this method, and instead, if specifying a custom schema is required, apply the
        ///     <see cref="T:System.Xml.Serialization.XmlSchemaProviderAttribute" /> to the class.
        /// </summary>
        /// <returns>
        /// An <see cref="T:System.Xml.Schema.XmlSchema" /> that describes the XML representation of the object that is produced by the
        ///     <see cref="M:System.Xml.Serialization.IXmlSerializable.WriteXml(System.Xml.XmlWriter)" /> method and consumed by the
        ///     <see cref="M:System.Xml.Serialization.IXmlSerializable.ReadXml(System.Xml.XmlReader)" /> method.
        /// </returns>
        public XmlSchema GetSchema()
        {
            return null;
        }

        /// <summary>
        /// Generates an object from its XML representation.
        /// </summary>
        /// <param name="reader">
        /// The <see cref="T:System.Xml.XmlReader"/> stream from which the object is deserialized.
        /// </param>
        public void ReadXml(XmlReader reader)
        {
            if (reader.IsEmptyElement || !reader.Read())
            {
                return;
            }

            reader.Read();

            while (reader.NodeType != XmlNodeType.EndElement)
            {
                reader.MoveToFirstAttribute();
                string key = reader.Value;
                reader.MoveToContent();
                reader.Read();
                CultureString value = (CultureString)ValueSerializer.Deserialize(reader);
                reader.ReadEndElement();
                reader.Read();
                Add(key, value);
            }

            reader.ReadEndElement(); // Read End Element to close Read of containing node
        }

        /// <summary>
        /// Converts an object into its XML representation.
        /// </summary>
        /// <param name="writer">
        /// The <see cref="T:System.Xml.XmlWriter"/> stream to which the object is serialized.
        /// </param>
        public void WriteXml(XmlWriter writer)
        {
            XmlSerializer valueSerializer = new XmlSerializer(typeof(CultureString));
            foreach (string key in Keys)
            {
                writer.WriteStartElement("Item");
                writer.WriteAttributeString("key", key);
                valueSerializer.Serialize(writer, this[key]);
                writer.WriteEndElement();
            }
        }

        /// <summary>
        /// Gets the text for the specified key.
        /// </summary>
        /// <param name="key">
        /// The key.
        /// </param>
        /// <returns>
        /// Text value
        /// </returns>
        public string Get(string key)
        {
            return Get(key, false);
        }

        /// <summary>
        /// Gets the text for the specified key.
        /// </summary>
        /// <param name="key">
        /// The key.
        /// </param>
        /// <param name="throwErrorIfNotFound">
        /// if set to <c>true</c> [throw error if not found].
        /// </param>
        /// <returns>
        /// Text value
        /// </returns>
        public string Get(string key, bool throwErrorIfNotFound)
        {
            foreach (string existingKey in Keys)
            {
                if (existingKey.Equals(key, StringComparison.OrdinalIgnoreCase))
                {
                    return this[existingKey].ToString();
                }
            }

            if (throwErrorIfNotFound)
            {
                throw new Exception("They Key \"" + key + "\" was not found in this dictionary");
            }

            return string.Format("Key not found: {0}", key);
        }
    }
}

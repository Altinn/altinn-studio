using System;
using System.Collections.Generic;
using System.Xml;
using System.Xml.Schema;
using System.Xml.Serialization;

namespace AltinnCore.ServiceLibrary.Extensions
{
    /// <summary>
    /// Serializable dictionary for the collections in Common
    /// </summary>
    /// <typeparam name="TKey">
    /// Type of key object
    /// </typeparam>
    /// <typeparam name="TValue">
    /// Type of value object
    /// </typeparam>
    [XmlRoot("dictionary")]
    public class SerializableDictionary<TKey, TValue> : Dictionary<TKey, TValue>, IXmlSerializable
    {
        private static bool _overide = true;

        #region Constructor

        /// <summary>
        /// Initializes a new instance of the <see cref="SerializableDictionary{TKey,TValue}"/> class
        /// </summary>
        public SerializableDictionary()
        {
        }

        #endregion

        #region IXmlSerializable Members

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
            XmlSerializer keySerializer = new XmlSerializer(typeof(TKey));
            XmlSerializer valueSerializer = new XmlSerializer(typeof(TValue));

            bool wasEmpty = reader.IsEmptyElement;
            reader.Read();

            if (wasEmpty)
            {
                return;
            }

            // var isSimpleKey = false;
            bool isSimpleKey = _overide ? false : typeof(TKey) == typeof(int) || typeof(TKey) == typeof(string);

            while (reader.NodeType != XmlNodeType.EndElement)
            {
                if (isSimpleKey)
                {
                    TKey key = default(TKey);
                    reader.Read();
                    reader.MoveToFirstAttribute();
                    if (typeof(TKey) == typeof(int))
                    {
                        int realKey;
                        if (int.TryParse(reader.Value, out realKey))
                        {
                            key = (TKey)(object)realKey;
                        }
                    }
                    else
                    {
                        key = (TKey)(object)reader.Value;
                    }

                    Console.WriteLine(key);
                    reader.MoveToContent();
                    reader.Read();
                    TValue value = (TValue)valueSerializer.Deserialize(reader);
                    reader.Read();
                    reader.ReadEndElement();
                    Add(key, value);
                }
                else
                {
                    reader.ReadStartElement("item");
                    reader.ReadStartElement("key");
                    TKey key = (TKey)keySerializer.Deserialize(reader);
                    reader.ReadEndElement();
                    reader.ReadStartElement("value");
                    TValue value = (TValue)valueSerializer.Deserialize(reader);
                    reader.ReadEndElement();
                    Add(key, value);
                    reader.ReadEndElement();
                    reader.MoveToContent();
                }
            }

            if (!isSimpleKey)
            {
                reader.ReadEndElement();
            }
        }

        /// <summary>
        /// Converts an object into its XML representation.
        /// </summary>
        /// <param name="writer">
        /// The <see cref="T:System.Xml.XmlWriter"/> stream to which the object is serialized.
        /// </param>
        public void WriteXml(XmlWriter writer)
        {
            XmlSerializer keySerializer = new XmlSerializer(typeof(TKey));
            XmlSerializer valueSerializer = new XmlSerializer(typeof(TValue));

            // var isSimpleKey = false; 
            bool isSimpleKey = _overide ? false : typeof(TKey) == typeof(int) || typeof(TKey) == typeof(string);
            foreach (TKey key in Keys)
            {
                writer.WriteStartElement("item");
                if (isSimpleKey)
                {
                    writer.WriteAttributeString("key", key.ToString());
                    TValue value = this[key];
                    valueSerializer.Serialize(writer, value);
                }
                else
                {
                    writer.WriteStartElement("key");
                    keySerializer.Serialize(writer, key);
                    writer.WriteEndElement();

                    writer.WriteStartElement("value");
                    TValue value = this[key];
                    valueSerializer.Serialize(writer, value);
                    writer.WriteEndElement();
                }

                writer.WriteEndElement();
            }
        }

        #endregion
    }

    /// <summary>
    /// A dictionary that can be serialized
    /// </summary>
    /// <typeparam name="TKey">
    /// The type of the key.
    /// </typeparam>
    public class SerializableDictionary<TKey> : Dictionary<TKey, string>, IXmlSerializable
    {
        #region Constructor

        /// <summary>
        /// Initializes a new instance of the <see cref="SerializableDictionary{TKey}"/> class
        /// </summary>
        public SerializableDictionary()
        {
        }

        #endregion

        #region IXmlSerializable

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
                // Key
                TKey key;
                reader.MoveToFirstAttribute();
                if (typeof(TKey) == typeof(int))
                {
                    int parsedKey;
                    int.TryParse(reader.Value, out parsedKey);
                    key = (TKey)(object)parsedKey;
                }
                else
                {
                    key = (TKey)(object)reader.Value;
                }

                reader.Read();

                // Value
                string value = reader.ReadContentAsString();
                reader.ReadEndElement();
                reader.Read();
                Add(key, value);
            }

            reader.ReadEndElement();
        }

        /// <summary>
        /// Converts an object into its XML representation.
        /// </summary>
        /// <param name="writer">
        /// The <see cref="T:System.Xml.XmlWriter"/> stream to which the object is serialized.
        /// </param>
        public void WriteXml(XmlWriter writer)
        {
            foreach (TKey key in Keys)
            {
                writer.WriteStartElement("item");
                writer.WriteAttributeString("key", key.ToString());
                writer.WriteString(this[key]);
                writer.WriteEndElement();
            }
        }

        #endregion
    }
}
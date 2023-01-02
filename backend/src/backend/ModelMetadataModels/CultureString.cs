#region Namespace imports

using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml;
using System.Xml.Linq;
using System.Xml.Schema;
using System.Xml.Serialization;

using Altinn.Studio.Designer.Extensions;

#endregion

namespace Altinn.Studio.Designer.ModelMetadatalModels
{
    /// <summary>
    /// Culture string
    /// </summary>
    public class CultureString : Dictionary<string, string>, IComparable<string>, IXmlSerializable
    {
        #region - Constructor -

        /// <summary>
        /// Initializes static members of the <see cref="CultureString" /> class.
        /// </summary>
        static CultureString()
        {
            FallbackLanguage = "nb";
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="CultureString" /> class.
        /// </summary>
        public CultureString()
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="CultureString"/> class.
        /// </summary>
        /// <param name="language">
        /// The language.
        /// </param>
        /// <param name="text">
        /// The text.
        /// </param>
        public CultureString(string language, string text)
        {
            Add(language, text);
        }

        #endregion

        #region - Properties -

        /// <summary>
        /// Gets or sets Fall back language
        /// </summary>
        public static string FallbackLanguage { get; set; }

        #endregion

        #region - Indexers -

        #endregion

        #region - Bool operators -

        #endregion<

        #region - Create Culture String -

        /// <summary>
        /// Create culture string
        /// </summary>
        /// <param name="source">
        /// Source XElement
        /// </param>
        /// <param name="name">
        /// Name as XName
        /// </param>
        /// <returns>
        /// Culture string
        /// </returns>
        public static CultureString CreateCultureString(XElement source, XName name)
        {
            return CreateCultureString(source, name, false);
        }

        /// <summary>
        /// Creates culture string
        /// </summary>
        /// <param name="source">
        /// Source XElement
        /// </param>
        /// <param name="name">
        /// Name as XName
        /// </param>
        /// <param name="stripParagraphTag">
        /// True if paragraph tagging has to be removed
        /// </param>
        /// <returns>
        /// Culture string
        /// </returns>
        public static CultureString CreateCultureString(XElement source, XName name, bool stripParagraphTag)
        {
            CultureString cultureString = new CultureString();
            foreach (XElement element in source.Elements(name))
            {
                string value = element.Value;
                if (stripParagraphTag)
                {
                    if (value.StartsWith("<p>"))
                    {
                        value = value.Remove(0, 2);
                    }

                    if (value.EndsWith("<p>"))
                    {
                        value = value.Remove(value.Length - 3, value.Length);
                    }
                }

                cultureString.Add(value, element.AttributeValue(XDocName.Lang));
            }

            return cultureString;
        }

        #endregion

        #region - ToString -s

        /// <summary>
        /// Returns a <see cref="string" /> that represents this instance.
        /// </summary>
        /// <returns>
        /// A <see cref="string" /> that represents this instance.
        /// </returns>
        public override string ToString()
        {
            return ToString("nb");
        }
        
        /// <summary>
        /// Returns a <see cref="string"/> that represents this instance.
        /// </summary>
        /// <param name="langauge">
        /// The language.
        /// </param>
        /// <returns>
        /// A <see cref="string"/> that represents this instance.
        /// </returns>
        public string ToString(string langauge)
        {
            // Has no text
            if (Count < 1)
            {
                return string.Empty;
            }

            // Correct text
            if (ContainsKey(langauge))
            {
                return this[langauge];
            }

            // Fallback default language
            if (ContainsKey(FallbackLanguage))
            {
                return this[FallbackLanguage];
            }

            // Fallback first set language
            return this.First().Value;
        }

        #endregion

        #region - Has Language -

        /// <summary>
        /// Check whether it has language or not
        /// </summary>
        /// <param name="language">
        /// Language details
        /// </param>
        /// <returns>
        /// True if it has language
        /// </returns>
        public bool HasLanguage(string language)
        {
            return ContainsKey(language) && !string.IsNullOrEmpty(this[language]);
        }

        #endregion

        #region - Get -

        /// <summary>
        /// Gets integer object
        /// </summary>
        /// <param name="obj">
        /// Object value
        /// </param>
        /// <returns>
        /// Integer object
        /// </returns>
        public string Get(object obj)
        {
            return obj is int ? Get((int)obj) : null;
        }

        /// <summary>
        /// Gets language
        /// </summary>
        /// <param name="language">
        /// Language ID
        /// </param>
        /// <returns>
        /// Language as string
        /// </returns>
        public string Get(string language)
        {
            return ContainsKey(language) ? this[language] : ToString();
        }

        #endregion

        #region - Set -

        /// <summary>
        /// Adds object
        /// </summary>
        /// <param name="obj">
        /// Object value
        /// </param>
        public void Add(object obj)
        {
            if (!(obj is KeyValuePair<string, string>))
            {
                return;
            }

            KeyValuePair<string, string> parsed = (KeyValuePair<string, string>)obj;
            Add(parsed.Key, parsed.Value);
        }

        #endregion

        #region - Equality -

        /// <summary>
        /// Checks whether the culture string is equal to an object value
        /// </summary>
        /// <param name="obj">
        /// Object value
        /// </param>
        /// <returns>
        /// True if both are equal
        /// </returns>
        public override bool Equals(object obj)
        {
            if (ReferenceEquals(null, obj))
            {
                return false;
            }

            if (ReferenceEquals(this, obj))
            {
                return true;
            }

            if (obj.GetType() != typeof(CultureString))
            {
                return false;
            }

            return Equals((CultureString)obj);
        }

        #endregion

        #region IComparable<string> Members

        /// <summary>
        /// Compares to other string
        /// </summary>
        /// <param name="other">
        /// Other string
        /// </param>
        /// <returns>
        /// Integer if equal
        /// </returns>
        public int CompareTo(string other)
        {
            return string.CompareOrdinal(other, ToString());
        }

        #endregion

        #region IXmlSerializable Members

        /// <summary>
        /// Gets XML schema
        /// </summary>
        /// <returns>
        /// Null value
        /// </returns>
        public XmlSchema GetSchema()
        {
            return null;
        }

        /// <summary>
        /// Reads XML
        /// </summary>
        /// <param name="reader">
        /// XML reader
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
                reader.MoveToFirstAttribute();
                string key = reader.Value;
                reader.Read();

                // Value
                string value = reader.ReadContentAsString();
                reader.ReadEndElement();
                reader.Read();

                Add(key, value);
            }

            reader.ReadEndElement(); // Read End Element to close Read of containing node
        }

        /// <summary>
        /// Writes XML
        /// </summary>
        /// <param name="writer">
        /// XML writer
        /// </param>
        public void WriteXml(XmlWriter writer)
        {
            foreach (string key in Keys)
            {
                if (string.IsNullOrEmpty(this[key]))
                {
                    continue;
                }

                writer.WriteStartElement("Text");
                writer.WriteAttributeString("lang", key);

                writer.WriteString(this[key]);
                writer.WriteEndElement();
            }
        }

        #endregion

        /// <summary>
        /// Checks whether it contains the search content
        /// </summary>
        /// <param name="searchContent">
        /// Search content
        /// </param>
        /// <returns>
        /// True if it contains
        /// </returns>
        public bool Contains(string searchContent)
        {
            string str = searchContent.ToLower();
            return this.Any(text => text.Value.ToLower().Contains(str));
        }

        /// <summary>
        /// Gets hash code
        /// </summary>
        /// <returns>
        /// Hash code
        /// </returns>
        public override int GetHashCode()
        {
            return Values.Sum(value => value.GetHashCode());
        }
    }
}

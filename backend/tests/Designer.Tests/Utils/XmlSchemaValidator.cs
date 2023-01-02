using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Xml;
using System.Xml.Schema;

namespace Designer.Tests.Utils
{
    public class XmlSchemaValidator
    {
        private readonly XmlSchema _xmlSchema;
        private readonly XmlReaderSettings _xmlReaderSettings;
        
        public XmlSchemaValidator(XmlSchema xmlSchema)
        {
            _xmlSchema = xmlSchema;

            _xmlReaderSettings = new XmlReaderSettings();
            _xmlReaderSettings.Schemas.Add(xmlSchema);
            _xmlReaderSettings.ValidationType = ValidationType.Schema;            
        }

        public List<ValidationEventArgs> ValidationErrors { get; private set; } = new List<ValidationEventArgs>();

        public bool ValidationSucceeded { get; private set; } = true;

        public bool TreatWarningsAsErrors { get; set; } = false;

        public bool Validate(string xml)
        {            
            byte[] byteArray = Encoding.ASCII.GetBytes(xml);
            using MemoryStream stream = new MemoryStream(byteArray);
            XmlReader reader = XmlReader.Create(stream);
            XmlDocument document = new XmlDocument();
            document.Load(reader);
            document.Schemas.Add(_xmlSchema);
            ValidationEventHandler eventHandler = new ValidationEventHandler(ValidationEventHandler);

            ValidationSucceeded = true;                        
            document.Validate(eventHandler);
            
            return ValidationSucceeded;
        }

        private void ValidationEventHandler(object sender, ValidationEventArgs e)
        {            
            switch (e.Severity)
            {
                case XmlSeverityType.Error:
                    ValidationSucceeded = false;
                    ValidationErrors.Add(e);
                    break;
                case XmlSeverityType.Warning:
                    if (TreatWarningsAsErrors)
                    {
                        ValidationSucceeded = false;
                        ValidationErrors.Add(e);
                    }

                    break;
            }
        }
    }
}

using System.Collections;
using System.Collections.Generic;

namespace DataModeling.Tests.TestDataClasses
{
    public class XmlRoundSerializationTestData : IEnumerable<object[]>
    {
        public IEnumerator<object[]> GetEnumerator()
        {
            yield return new object[] { "Seres/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd", "Altinn.App.Models.HvemErHvem_M", "Seres/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xml" };
            yield return new object[] { "Model/XmlSchema/General/ReferenceArray.xsd", "Altinn.App.Models.Skjema", "Model/Xml/General/ReferenceArray.xml" };
        }

        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }
}

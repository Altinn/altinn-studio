using System.Collections;
using System.Collections.Generic;

namespace DataModeling.Tests.TestDataClasses
{
    public class JsonRoundSerializationTestData : IEnumerable<object[]>
    {
        public IEnumerator<object[]> GetEnumerator()
        {
            yield return new object[] { "Seres/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd", "Altinn.App.Models.HvemErHvem_M", "Seres/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.json" };
            yield return new object[] { "Model/XmlSchema/General/ReferenceArray.xsd", "Altinn.App.Models.Skjema", "Model/Json/General/ReferenceArray.json" };
        }

        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }
}

using System.Collections;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

namespace Designer.Tests.Factories.ModelFactory.DataClasses;

[ExcludeFromCodeCoverage]
public class CSharpEnd2EndTestData : IEnumerable<object[]>
{
    public IEnumerator<object[]> GetEnumerator()
    {
        yield return new object[] { "Model/XmlSchema/Gitea/nsm-klareringsportalen.xsd", "Model/CSharp/Gitea/nsm-klareringsportalen.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/stami-mu-bestilling-2021.xsd", "Model/CSharp/Gitea/stami-mu-bestilling-2021.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/dat-aarligmelding-bemanning.xsd", "Model/CSharp/Gitea/dat-aarligmelding-bemanning.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/dihe-redusert-foreldrebetaling-bhg.xsd", "Model/CSharp/Gitea/dihe-redusert-foreldrebetaling-bhg.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/hi-algeskjema.xsd", "Model/CSharp/Gitea/hi-algeskjema.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/Kursdomene_APINøkkel_M_2020-05-26_5702_34556_SERES.xsd", "Model/CSharp/Gitea/Kursdomene_APINøkkel_M_2020-05-26_5702_34556_SERES.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/nbib-melding.xsd", "Model/CSharp/Gitea/nbib-melding.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/udir-invitasjon-vfkl.xsd", "Model/CSharp/Gitea/udir-invitasjon-vfkl.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/udir-vfkl.xsd", "Model/CSharp/Gitea/udir-vfkl.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/bokskjema.xsd", "Model/CSharp/Gitea/bokskjema.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/dat-bilpleie-soknad.xsd", "Model/CSharp/Gitea/dat-bilpleie-soknad.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/dat-skjema.xsd", "Model/CSharp/Gitea/dat-skjema.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/Kursdomene_BliTjenesteeier_M_2020-05-25_5703_34553_SERES.xsd", "Model/CSharp/Gitea/Kursdomene_BliTjenesteeier_M_2020-05-25_5703_34553_SERES.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/Kursdomene_BekrefteBruksvilkår_M_2020-05-25_5704_34554_SERES.xsd", "Model/CSharp/Gitea/Kursdomene_BekrefteBruksvilkår_M_2020-05-25_5704_34554_SERES.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/srf-fufinn-behovskartleggin.xsd", "Model/CSharp/Gitea/srf-fufinn-behovskartleggin.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/srf-melding-til-statsforvalteren.xsd", "Model/CSharp/Gitea/srf-melding-til-statsforvalteren.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/udi-unntak-karantenehotell-velferd.xsd", "Model/CSharp/Gitea/udi-unntak-karantenehotell-velferd.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/skjema.xsd", "Model/CSharp/Gitea/skjema.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/srf-fufinn-behovsendring.xsd", "Model/CSharp/Gitea/srf-fufinn-behovsendring.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/stami-atid-databehandler-2022.xsd", "Model/CSharp/Gitea/stami-atid-databehandler-2022.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/stami-mu-databehandler-2021.xsd", "Model/CSharp/Gitea/stami-mu-databehandler-2021.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/skd-formueinntekt-skattemelding-v2.xsd", "Model/CSharp/Gitea/skd-formueinntekt-skattemelding-v2.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/aal-vedlegg.xsd", "Model/CSharp/Gitea/aal-vedlegg.cs" };
        yield return new object[] { "Model/XmlSchema/Gitea/krt-1188a-1.xsd", "Model/CSharp/Gitea/krt-1188a-1.cs" };
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}

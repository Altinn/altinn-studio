using System.Collections;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

namespace DataModeling.Tests.TestDataClasses;

[ExcludeFromCodeCoverage]
public class CSharpEnd2EndTestData : IEnumerable<object[]>
{
    public IEnumerator<object[]> GetEnumerator()
    {
        yield return ["Model/XmlSchema/Gitea/nsm-klareringsportalen.xsd", "Model/CSharp/Gitea/nsm-klareringsportalen.cs"];
        yield return ["Model/XmlSchema/Gitea/stami-mu-bestilling-2021.xsd", "Model/CSharp/Gitea/stami-mu-bestilling-2021.cs"];
        yield return ["Model/XmlSchema/Gitea/dat-aarligmelding-bemanning.xsd", "Model/CSharp/Gitea/dat-aarligmelding-bemanning.cs"];
        yield return ["Model/XmlSchema/Gitea/dihe-redusert-foreldrebetaling-bhg.xsd", "Model/CSharp/Gitea/dihe-redusert-foreldrebetaling-bhg.cs"];
        yield return ["Model/XmlSchema/Gitea/hi-algeskjema.xsd", "Model/CSharp/Gitea/hi-algeskjema.cs"];
        yield return ["Model/XmlSchema/Gitea/Kursdomene_APINøkkel_M_2020-05-26_5702_34556_SERES.xsd", "Model/CSharp/Gitea/Kursdomene_APINøkkel_M_2020-05-26_5702_34556_SERES.cs"];
        yield return ["Model/XmlSchema/Gitea/nbib-melding.xsd", "Model/CSharp/Gitea/nbib-melding.cs"];
        yield return ["Model/XmlSchema/Gitea/udir-invitasjon-vfkl.xsd", "Model/CSharp/Gitea/udir-invitasjon-vfkl.cs"];
        yield return ["Model/XmlSchema/Gitea/udir-vfkl.xsd", "Model/CSharp/Gitea/udir-vfkl.cs"];
        yield return ["Model/XmlSchema/Gitea/bokskjema.xsd", "Model/CSharp/Gitea/bokskjema.cs"];
        yield return ["Model/XmlSchema/Gitea/dat-bilpleie-soknad.xsd", "Model/CSharp/Gitea/dat-bilpleie-soknad.cs"];
        yield return ["Model/XmlSchema/Gitea/dat-skjema.xsd", "Model/CSharp/Gitea/dat-skjema.cs"];
        yield return ["Model/XmlSchema/Gitea/Kursdomene_BliTjenesteeier_M_2020-05-25_5703_34553_SERES.xsd", "Model/CSharp/Gitea/Kursdomene_BliTjenesteeier_M_2020-05-25_5703_34553_SERES.cs"];
        yield return ["Model/XmlSchema/Gitea/Kursdomene_BekrefteBruksvilkår_M_2020-05-25_5704_34554_SERES.xsd", "Model/CSharp/Gitea/Kursdomene_BekrefteBruksvilkår_M_2020-05-25_5704_34554_SERES.cs"];
        yield return ["Model/XmlSchema/Gitea/srf-fufinn-behovskartleggin.xsd", "Model/CSharp/Gitea/srf-fufinn-behovskartleggin.cs"];
        yield return ["Model/XmlSchema/Gitea/srf-melding-til-statsforvalteren.xsd", "Model/CSharp/Gitea/srf-melding-til-statsforvalteren.cs"];
        yield return ["Model/XmlSchema/Gitea/udi-unntak-karantenehotell-velferd.xsd", "Model/CSharp/Gitea/udi-unntak-karantenehotell-velferd.cs"];
        yield return ["Model/XmlSchema/Gitea/skjema.xsd", "Model/CSharp/Gitea/skjema.cs"];
        yield return ["Model/XmlSchema/Gitea/srf-fufinn-behovsendring.xsd", "Model/CSharp/Gitea/srf-fufinn-behovsendring.cs"];
        yield return ["Model/XmlSchema/Gitea/stami-atid-databehandler-2022.xsd", "Model/CSharp/Gitea/stami-atid-databehandler-2022.cs"];
        yield return ["Model/XmlSchema/Gitea/stami-mu-databehandler-2021.xsd", "Model/CSharp/Gitea/stami-mu-databehandler-2021.cs"];
        yield return ["Model/XmlSchema/Gitea/skd-formueinntekt-skattemelding-v2.xsd", "Model/CSharp/Gitea/skd-formueinntekt-skattemelding-v2.cs"];
        yield return ["Model/XmlSchema/Gitea/aal-vedlegg.xsd", "Model/CSharp/Gitea/aal-vedlegg.cs"];
        yield return ["Model/XmlSchema/Gitea/krt-1188a-1.xsd", "Model/CSharp/Gitea/krt-1188a-1.cs"];
        yield return ["Model/XmlSchema/Gitea/3422-39646.xsd", "Model/CSharp/Gitea/3422-39646.cs"];
        yield return ["Model/XmlSchema/Gitea/3430-39615.xsd", "Model/CSharp/Gitea/3430-39615.cs"];
        yield return ["Model/XmlSchema/Gitea/Brønnøysundregistrene_ReelleRettighetshavere_M.xsd", "Model/CSharp/Gitea/Brønnøysundregistrene_ReelleRettighetshavere_M.cs"];
        yield return ["Model/XmlSchema/Gitea/dev-nill-test.xsd", "Model/CSharp/Gitea/dev-nill-test.cs"];
        yield return ["Model/Issue/gh14544/XmlSchema/simple-type-array.xsd", "Model/Issue/gh14544/CSharp/simple-type-array.cs"];

        // xs:all test cases
        yield return ["Model/XmlSchema/XsAll/ferdigattest/v4/ferdigattest.xsd", "Model/CSharp/XsAll/ferdigattest/v4/ferdigattest.cs"];
        yield return ["Model/XmlSchema/XsAll/igangsettingstillatelse/v4/igangsettingstillatelse.xsd", "Model/CSharp/XsAll/igangsettingstillatelse/v4/igangsettingstillatelse.cs"];
        yield return ["Model/XmlSchema/XsAll/midlertidigbrukstillatelse/v4/midlertidigbrukstillatelse.xsd", "Model/CSharp/XsAll/midlertidigbrukstillatelse/v4/midlertidigbrukstillatelse.cs"];
        yield return ["Model/XmlSchema/XsAll/planvarsel/v2/planvarsel.xsd", "Model/CSharp/XsAll/planvarsel/v2/planvarsel.cs"];
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}

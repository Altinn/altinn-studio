using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Implementation;
using Moq;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    /// <summary>
    /// Test class for <see cref="PolicyRetrievalPoint"/>
    /// </summary>
    public class PolicyRetrievalPointTest
    {

        /// <summary>
        /// Test case:
        /// Expected: 
        /// </summary>
        public void Eksempelkode()
        {
            /*
            Verken WritePolicy eller GetPolicy er implementert enda, men du kan implementere testcases
            og sette opp det du har som forventet input og output, uten å kjøre testene.
            Evt. kan du jo sette opp en par tester og så prøve deg litt på implementasjon av klassene.
            Da tror jeg write policy vil være den som er enklest å starte med.

            Nedenfor har du noen eksempler på hvordan du setter opp mocken på policyRepository og bestemmer output. 
             */


            // Setter opp en policy repository mock som uavhengig av strengen den få inn som input returnerer datastream
            Moq.Mock<IPolicyRepository> policyRepositoryMock = new Mock<IPolicyRepository>();
            Stream dataStream = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");
            policyRepositoryMock.Setup(p => p.GetPolicy(It.IsAny<string>())).Returns(Task.FromResult(dataStream));

            // Setter opp en policy repository mock som returnerer datastream hvis input matcher "org/app/policy.xml". Tror det er null som returneres hvis ikke. 
            Moq.Mock<IPolicyRepository> policyRepositoryMock_1 = new Mock<IPolicyRepository>();
            Stream dataStream_1 = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");
            policyRepositoryMock_1.Setup(p => p.GetPolicy(It.Is<string>(s => s.Equals("org/app/policy.xml")))).Returns(Task.FromResult(dataStream_1));

            // Setter opp en policy repository mock som uavhengig av input kaster exception av typen argument null exception.
            Moq.Mock<IPolicyRepository> policyRepositoryMock_2 = new Mock<IPolicyRepository>();
            Stream dataStream_2 = File.OpenRead("Data/Xacml/3.0/PolicyRepository/IIA003Policy.xml");
            policyRepositoryMock_1.Setup(p => p.GetPolicy(It.IsAny<string>())).Throws(new ArgumentNullException("Value cannot be null"));

            // Setter opp en instans av prp-klassen med mocken.
            PolicyRetrievalPoint pr = new PolicyRetrievalPoint(policyRepositoryMock.Object);
        }

    }
}

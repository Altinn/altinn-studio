using Altinn.ApiClients.Maskinporten.Config;

namespace Altinn.Studio.Designer.Configuration
{
    public class MaskinportenClientSettings : MaskinportenSettings
    {
        public new string Environment { get; set; }

        public new string ClientId { get; set; }

        public new string Scope { get; set; }

        public new string EncodedJwk { get; set; }

        public new bool ExhangeToAltinnToken { get; set; }
    }
}

using Altinn.ApiClients.Maskinporten.Config;

namespace Altinn.Studio.Designer.Configuration
{
    public class MaskinportenClientSettings : MaskinportenSettings
    {
        public string Environment { get; set; }

        public string ClientId { get; set; }

        public string ClientIdProd { get; set; }

        public string Scope { get; set; }

        public string EncodedJwk { get; set; }

        public string EncodedJwkProd { get; set; }

        public bool ExhangeToAltinnToken { get; set; }
    }
}

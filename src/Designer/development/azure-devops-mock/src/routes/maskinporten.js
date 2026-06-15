const maskinportenScope = (name, description, allowedIntegrationTypes = ['maskinporten']) => {
  const separatorIndex = name.indexOf(':');
  const prefix = separatorIndex === -1 ? name : name.slice(0, separatorIndex);
  const subscope = separatorIndex === -1 ? name : name.slice(separatorIndex + 1);

  return {
    prefix,
    subscope,
    name,
    description,
    active: true,
    allowed_integration_types: allowedIntegrationTypes,
  };
};

const accessibleForAllScopes = [
  maskinportenScope('altinn:appdeploy', 'Deploy apps in Altinn Studio'),
  maskinportenScope('altinn:broker.read', 'Read file transfer metadata and files'),
  maskinportenScope('altinn:broker.write', 'Send files through the broker service'),
  maskinportenScope('altinn:brokerservice.read', 'Read files sent to you in Altinn'),
  maskinportenScope('altinn:brokerservice.write', 'Send files to others through Altinn'),
  maskinportenScope('altinn:clientdelegations.read', 'Read client delegation data'),
  maskinportenScope('altinn:clientdelegations.write', 'Change client delegation data'),
  maskinportenScope('altinn:clientdelegations/myclients.read', 'Read received client delegations'),
  maskinportenScope(
    'altinn:clientdelegations/myclients.write',
    'Delete received client delegations',
  ),
  maskinportenScope('altinn:consentrequests.read', 'Read consent requests'),
  maskinportenScope('altinn:consentrequests.write', 'Write consent requests'),
  maskinportenScope('altinn:consenttokens', 'Use authenticated consent tokens'),
  maskinportenScope(
    'altinn:correspondence.read',
    'Receive messages from the correspondence service',
  ),
  maskinportenScope(
    'altinn:correspondence.write',
    'Send messages through the correspondence service',
  ),
  maskinportenScope('altinn:delegationrequests.read', 'Read end-user delegation requests'),
  maskinportenScope('altinn:delegationrequests.write', 'Write end-user delegation requests'),
  maskinportenScope('altinn:delegations.read', 'Read delegated roles and rights'),
  maskinportenScope('altinn:delegations.write', 'Administer delegated roles and rights'),
  maskinportenScope('altinn:enduser', 'Full end-user access to Altinn'),
  maskinportenScope('altinn:enterprisebrokerservice', 'Use enterprise broker service APIs'),
  maskinportenScope('altinn:enterpriseusers.read', 'Read enterprise users'),
  maskinportenScope('altinn:enterpriseusers.write', 'Write enterprise users'),
  maskinportenScope('altinn:events.subscribe', 'Subscribe to events through Altinn Events'),
  maskinportenScope('altinn:instances.meta', 'Read inbox and archive metadata'),
  maskinportenScope('altinn:instances.read', 'Read inbox and archive content'),
  maskinportenScope('altinn:instances.write', 'Create, fill, sign and submit instances'),
  maskinportenScope('altinn:lookup', 'Use lookup services in Altinn'),
  maskinportenScope('altinn:profiles.read', 'Read contact information in Altinn'),
  maskinportenScope('altinn:profiles.write', 'Change contact information in Altinn'),
  maskinportenScope('altinn:reportees', 'Read parties you can represent in Altinn'),
  maskinportenScope('altinn:roledefinitions.read', 'Read local role definitions'),
  maskinportenScope('altinn:roledefinitions.write', 'Administer local role definitions'),
  maskinportenScope('altinn:rolesandrights.read', 'Read received roles and rights'),
  maskinportenScope('altinn:rolesandrights.write', 'Remove received roles and rights'),
  maskinportenScope('altinn:systembruker.demo', 'Reference API scope for system user demos'),
  maskinportenScope(
    'altinn:accessmanagement/authorizedparties',
    'Read authorized parties for an end user',
    ['api_klient', 'maskinporten'],
  ),
  maskinportenScope(
    'altinn:accessmanagement/enduser:connections:fromothers.read',
    'Read accesses received from others',
    ['api_klient', 'maskinporten'],
  ),
  maskinportenScope(
    'altinn:accessmanagement/enduser:connections:fromothers.write',
    'Delete accesses received from others',
    ['api_klient', 'maskinporten'],
  ),
  maskinportenScope(
    'altinn:accessmanagement/enduser:connections:toothers.read',
    'Read accesses given to others',
    ['api_klient', 'maskinporten'],
  ),
  maskinportenScope(
    'altinn:accessmanagement/enduser:connections:toothers.write',
    'Administer accesses given to others',
    ['api_klient', 'maskinporten'],
  ),
  maskinportenScope(
    'altinn:accessmanagement/enduser:requests.read',
    'Read sent and received authorization requests',
    ['api_klient', 'maskinporten'],
  ),
  maskinportenScope(
    'altinn:accessmanagement/enduser:requests.write',
    'Manage sent and received authorization requests',
    ['api_klient', 'maskinporten'],
  ),
  maskinportenScope('arkitektum:niregtest', 'Test scope for NIREG'),
  maskinportenScope('bdo:testing', 'Testing scope'),
  maskinportenScope('dan:altinnstudioapps', 'Read data from data.altinn.no from Studio apps'),
  maskinportenScope('dan:test', 'Open technical test scope for data.altinn.no'),
  maskinportenScope('digdir:dialogporten', 'Read content from Dialogporten'),
  maskinportenScope('digdir:verksemd.eu', 'Test EU SEAL client authentication'),
  maskinportenScope('difitest:accessibleforall', 'Test scope accessible for all'),
  maskinportenScope('eformidling:dph.read', 'Read access for Fastlege messages'),
  maskinportenScope('eformidling:dph.write', 'Write access for Fastlege messages'),
  maskinportenScope('fdir:biomassreportingapi', 'Submit biomass reports'),
  maskinportenScope('fdir:ers.delegated.read', 'Delegated read access for ERS data'),
  maskinportenScope('fdir:priceboardreportingapi', 'Submit price reports'),
  maskinportenScope('idporten:testscope.read', 'Test ID-porten read scope'),
  maskinportenScope('mattilsynet:akvakultur.innrapportering.lakselus', 'Report salmon lice data'),
  maskinportenScope(
    'mattilsynet:akvakultur.innrapportering.settefisk',
    'Report juvenile fish data',
  ),
  maskinportenScope('mattilsynet:plantevern.journal.innlesing', 'Read plant protection journals'),
  maskinportenScope(
    'nav:inntektsmelding/foreldrepenger',
    'Income message API for parental benefit',
  ),
  maskinportenScope('nav:kuhr/krav2', 'KUHR claim API'),
  maskinportenScope('nav:syfo/arkivporten', 'SYFO archive API'),
  maskinportenScope('nav:syfo/dokumentporten', 'SYFO document API'),
  maskinportenScope('nav:syfo/narmesteleder/lps', 'SYFO closest manager API'),
  maskinportenScope('nav:utbetaling/oppgjorsrapporter', 'Payment settlement reports'),
  maskinportenScope(
    'politiet:anmeldelse.api.virksomhet.write',
    'Submit reports on behalf of enterprises',
  ),
  maskinportenScope(
    'politiet:mistenkelige.forhold.hvitvaskingsloven',
    'Report suspicious conditions under the anti-money laundering act',
  ),
];

const accessScopes = [
  {
    scope: 'altinn:serviceowner/instances.read',
    state: 'APPROVED',
  },
  {
    scope: 'altinn:serviceowner/instances.write',
    state: 'APPROVED',
  },
  {
    scope: 'altinn:accessmanagement/authorizedparties.admin',
    state: 'APPROVED',
  },
  {
    scope: 'altinn:accessmanagement/authorizedparties.resourceowner',
    state: 'APPROVED',
  },
  {
    scope: 'altinn:authentication/systemregister',
    state: 'APPROVED',
  },
  {
    scope: 'altinn:authentication/systemregister.admin',
    state: 'APPROVED',
  },
  {
    scope: 'altinn:authentication/systemregister.write',
    state: 'APPROVED',
  },
  {
    scope: 'altinn:authentication/systemuser.request.read',
    state: 'APPROVED',
  },
  {
    scope: 'altinn:authentication/systemuser.request.write',
    state: 'APPROVED',
  },
  {
    scope: 'altinn:authorization/authorize',
    state: 'APPROVED',
  },
  {
    scope: 'altinn:appdeploy',
    state: 'APPROVED',
  },
  {
    scope: 'altinn:accessmanagement/authorizedparties.rejected',
    state: 'REJECTED',
  },
];

export const accessibleForAllScopesRoute = async (req, res) => {
  res.json(accessibleForAllScopes);
};

export const accessScopesRoute = async (req, res) => {
  res.json(accessScopes);
};

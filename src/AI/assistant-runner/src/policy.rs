use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr};

use sandbox_authorization::{
    AuthorizationContext, AuthorizationDecision, AuthorizationRequest, AuthorizationValue, Error, LocalFuture,
    PolicyEngine,
    vocabulary::{action, context, principal_kind},
};

/// The only hosts that a job can reach.
///
/// `dotnet restore` downloads packages from `api.nuget.org`, and studioctl finds package versions through the
/// package search hosts. Change this list only through a reviewed pull request.
const ALLOWED_HOSTS: &[&str] = &[
    "api.nuget.org",
    "azuresearch-usnc.nuget.org",
    "azuresearch-ussc.nuget.org",
];

const HTTPS_PORT: u16 = 443;

/// Address ranges that are not on the internet: the cluster, the node, the Sandbox gateway, link-local and the
/// Azure services that answer only inside Azure.
const BLOCKED_IPV4: &[(Ipv4Addr, u32)] = &[
    (Ipv4Addr::UNSPECIFIED, 8),
    (Ipv4Addr::new(10, 0, 0, 0), 8),
    (Ipv4Addr::new(100, 64, 0, 0), 10),
    (Ipv4Addr::new(127, 0, 0, 0), 8),
    (Ipv4Addr::new(168, 63, 129, 16), 32),
    (Ipv4Addr::new(169, 254, 0, 0), 16),
    (Ipv4Addr::new(172, 16, 0, 0), 12),
    (Ipv4Addr::new(192, 168, 0, 0), 16),
    (Ipv4Addr::new(224, 0, 0, 0), 3),
];

const BLOCKED_IPV6: &[(Ipv6Addr, u32)] = &[
    (Ipv6Addr::UNSPECIFIED, 128),
    (Ipv6Addr::LOCALHOST, 128),
    (Ipv6Addr::new(0xfc00, 0, 0, 0, 0, 0, 0, 0), 7),
    (Ipv6Addr::new(0xfe80, 0, 0, 0, 0, 0, 0, 0), 10),
    (Ipv6Addr::new(0xff00, 0, 0, 0, 0, 0, 0, 0), 8),
];

/// Lets a job VM resolve and reach the hosts in [`ALLOWED_HOSTS`] with HTTPS, and denies all other network access.
pub struct AllowlistPolicy;

impl PolicyEngine for AllowlistPolicy {
    fn evaluate(&self, request: AuthorizationRequest) -> LocalFuture<'_, Result<AuthorizationDecision, Error>> {
        let decision = if is_allowed(&request) {
            AuthorizationDecision::Allow
        } else {
            AuthorizationDecision::Deny
        };
        Box::pin(async move { Ok(decision) })
    }
}

fn is_allowed(request: &AuthorizationRequest) -> bool {
    if request.principal.kind != principal_kind::SANDBOX {
        return false;
    }
    match request.action.as_str() {
        action::DNS_QUERY => is_allowed_host(&request.resource.id),
        action::NETWORK_CONNECT => is_allowed_connection(&request.context),
        action::HTTP_REQUEST => is_allowed_http_request(&request.context),
        _ => false,
    }
}

fn is_allowed_connection(facts: &AuthorizationContext) -> bool {
    text(facts, context::NETWORK_TRANSPORT) == Some("tcp")
        && !is_true(facts, context::NETWORK_DESTINATION_IS_HOST)
        && is_public_https_destination(facts)
        && text(facts, context::NETWORK_HOSTNAME).is_some_and(is_allowed_host)
}

fn is_allowed_http_request(facts: &AuthorizationContext) -> bool {
    text(facts, context::HTTP_SCHEME) == Some("https")
        && is_public_https_destination(facts)
        && text(facts, context::HTTP_AUTHORITY)
            .and_then(https_host)
            .is_some_and(is_allowed_host)
}

fn is_public_https_destination(facts: &AuthorizationContext) -> bool {
    text(facts, context::NETWORK_DESTINATION_ADDRESS)
        .and_then(|address| address.parse::<SocketAddr>().ok())
        .is_some_and(|address| address.port() == HTTPS_PORT && is_public(address.ip()))
}

/// The host of an HTTP authority, if the authority has no port or port 443.
fn https_host(authority: &str) -> Option<&str> {
    match authority.rsplit_once(':') {
        None => Some(authority),
        Some((host, port)) => (port.parse() == Ok(HTTPS_PORT)).then_some(host),
    }
}

fn is_allowed_host(host: &str) -> bool {
    let host = host.strip_suffix('.').unwrap_or(host);
    ALLOWED_HOSTS.iter().any(|allowed| host.eq_ignore_ascii_case(allowed))
}

fn is_public(address: IpAddr) -> bool {
    match address {
        IpAddr::V4(address) => is_public_ipv4(address),
        IpAddr::V6(address) => address.to_ipv4_mapped().map_or_else(
            || {
                !BLOCKED_IPV6
                    .iter()
                    .any(|&(network, prefix)| same_prefix(address.to_bits(), network.to_bits(), prefix))
            },
            is_public_ipv4,
        ),
    }
}

fn is_public_ipv4(address: Ipv4Addr) -> bool {
    !BLOCKED_IPV4.iter().any(|&(network, prefix)| {
        same_prefix(
            u128::from(address.to_bits()) << 96,
            u128::from(network.to_bits()) << 96,
            prefix,
        )
    })
}

fn same_prefix(address: u128, network: u128, prefix: u32) -> bool {
    let mask = u128::MAX.checked_shl(128 - prefix).unwrap_or(0);
    address & mask == network & mask
}

fn text<'a>(facts: &'a AuthorizationContext, name: &str) -> Option<&'a str> {
    facts.get(name).and_then(|value| value.as_str())
}

fn is_true(facts: &AuthorizationContext, name: &str) -> bool {
    facts.get(name).and_then(AuthorizationValue::as_bool) == Some(true)
}

#[cfg(test)]
mod tests {
    use sandbox_authorization::{
        Action, AuthorizationContext, AuthorizationRequest, Principal, Resource,
        vocabulary::{action, context, principal_kind, resource_kind},
    };

    use super::is_allowed;

    const NUGET_ADDRESS: &str = "13.107.246.40:443";

    fn request(action: &str, resource: &str, facts: AuthorizationContext) -> AuthorizationRequest {
        AuthorizationRequest {
            principal: Principal::new(principal_kind::SANDBOX, "sandbox-id"),
            action: Action::new(action),
            resource: Resource::new(resource_kind::EXTERNAL_SERVICE, resource),
            context: facts,
        }
    }

    fn connection(hostname: Option<&str>, destination: &str) -> AuthorizationRequest {
        let mut facts = AuthorizationContext::new()
            .with_attribute(context::NETWORK_DESTINATION_ADDRESS, destination)
            .with_attribute(context::NETWORK_DESTINATION_IS_HOST, false)
            .with_attribute(context::NETWORK_TRANSPORT, "tcp");
        if let Some(hostname) = hostname {
            facts.insert(context::NETWORK_HOSTNAME, hostname);
        }
        request(action::NETWORK_CONNECT, destination, facts)
    }

    fn http_request(scheme: &str, authority: &str, destination: &str) -> AuthorizationRequest {
        let facts = AuthorizationContext::new()
            .with_attribute(context::NETWORK_DESTINATION_ADDRESS, destination)
            .with_attribute(context::HTTP_SCHEME, scheme)
            .with_attribute(context::HTTP_AUTHORITY, authority);
        request(action::HTTP_REQUEST, authority, facts)
    }

    fn dns_query(name: &str) -> AuthorizationRequest {
        request(action::DNS_QUERY, name, AuthorizationContext::new())
    }

    #[test]
    fn allows_dns_https_connections_and_requests_to_the_listed_hosts() {
        for allowed in [
            dns_query("api.nuget.org"),
            dns_query("API.NuGet.org."),
            dns_query("azuresearch-usnc.nuget.org"),
            connection(Some("api.nuget.org"), NUGET_ADDRESS),
            http_request("https", "api.nuget.org", NUGET_ADDRESS),
            http_request("https", "azuresearch-ussc.nuget.org:443", NUGET_ADDRESS),
        ] {
            assert!(is_allowed(&allowed), "{allowed:?}");
        }
    }

    #[test]
    fn denies_hosts_that_are_not_listed() {
        for denied in [
            dns_query("example.com"),
            dns_query("nuget.org"),
            dns_query("evil-api.nuget.org"),
            dns_query("api.nuget.org.example.com"),
            connection(Some("example.com"), NUGET_ADDRESS),
            connection(None, NUGET_ADDRESS),
            http_request("https", "example.com", NUGET_ADDRESS),
        ] {
            assert!(!is_allowed(&denied), "{denied:?}");
        }
    }

    #[test]
    fn denies_other_ports_and_plain_http() {
        for denied in [
            connection(Some("api.nuget.org"), "13.107.246.40:80"),
            http_request("http", "api.nuget.org", "13.107.246.40:80"),
            http_request("https", "api.nuget.org:8443", "13.107.246.40:8443"),
            http_request("https", "api.nuget.org", "13.107.246.40:80"),
        ] {
            assert!(!is_allowed(&denied), "{denied:?}");
        }
    }

    #[test]
    fn denies_addresses_that_are_not_on_the_internet() {
        for destination in [
            "10.1.2.3:443",
            "100.64.0.1:443",
            "127.0.0.1:443",
            "168.63.129.16:443",
            "169.254.169.254:443",
            "172.20.0.1:443",
            "192.168.1.1:443",
            "0.0.0.0:443",
            "[::1]:443",
            "[fd00::1]:443",
            "[fe80::1]:443",
            "[::ffff:10.0.0.1]:443",
        ] {
            assert!(
                !is_allowed(&connection(Some("api.nuget.org"), destination)),
                "{destination}"
            );
            assert!(
                !is_allowed(&http_request("https", "api.nuget.org", destination)),
                "{destination}"
            );
        }
    }

    #[test]
    fn denies_the_host_udp_and_other_principals_and_actions() {
        let mut to_host = connection(Some("api.nuget.org"), NUGET_ADDRESS);
        to_host.context.insert(context::NETWORK_DESTINATION_IS_HOST, true);
        let mut udp = connection(Some("api.nuget.org"), NUGET_ADDRESS);
        udp.context.insert(context::NETWORK_TRANSPORT, "udp");
        let mut other_principal = dns_query("api.nuget.org");
        other_principal.principal = Principal::new("agent", "id");
        let secret = request(action::SECRET_USE, "api.nuget.org", AuthorizationContext::new());
        for denied in [to_host, udp, other_principal, secret] {
            assert!(!is_allowed(&denied), "{denied:?}");
        }
    }
}

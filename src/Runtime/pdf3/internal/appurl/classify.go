package appurl

import (
	"errors"
	"net/url"
	"regexp"
	"strings"
)

// Kind is what a PDF request's URL points to, see Classify.
type Kind string

const (
	// KindStandard is the app's normal PDF page, as app-lib's PdfService builds it.
	KindStandard Kind = "standard"
	// KindAppOther is another page of the app, on its own host and under /{org}/{app}/.
	KindAppOther Kind = "app_other"
	// KindClusterLocal is a Kubernetes service inside the cluster, on a host ending in
	// .cluster.local or .svc, with any scheme or port. pdf3 in a cluster shared by every service
	// owner cannot reach another cluster's services.
	KindClusterLocal Kind = "cluster_local"
	// KindOther is anything else: another host, scheme or path, or an invalid URL.
	KindOther Kind = "other"
)

const guidPattern = `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`

// standardPagePath matches the page path app-lib's PdfService builds from the default
// PdfGeneratorSettings.AppPdfPagePathTemplate, after /{org}/{app}/ and before the query:
// instance/{partyId}/{instanceGuid}, and for a subform
// instance/{partyId}/{instanceGuid}/{taskId}/subform/{componentId}/{dataElementGuid}/.
var standardPagePath = regexp.MustCompile(
	`(?i)^instance/[0-9]+/` + guidPattern + `(/[a-z0-9_-]+/subform/[a-z0-9_-]+/` + guidPattern + `/)?$`,
)

// standardQueryKeys are the query parameters PdfService sets: pdf=1, lang, and task for each
// task an automatic PDF covers.
var standardQueryKeys = map[string]bool{"pdf": true, "lang": true, "task": true}

// Classify returns the kind of page rawURL is in the environment whose app hostname is
// appHostname, which must be set: KindStandard, KindAppOther, KindClusterLocal or KindOther.
// For KindOther it also returns why the URL is not an app URL, as a short reason such as
// "host" or "org_mismatch".
func Classify(rawURL string, appHostname string) (Kind, string) {
	if isClusterLocal(rawURL) {
		return KindClusterLocal, ""
	}
	app, err := Parse(rawURL, appHostname)
	if err != nil {
		return KindOther, rejectionReason(err)
	}
	if isStandardPage(rawURL, app) {
		return KindStandard, ""
	}
	return KindAppOther, ""
}

// isClusterLocal reports whether rawURL's host is a Kubernetes service name:
// {service}.{namespace}.svc.cluster.local, or the short form {service}.{namespace}.svc.
func isClusterLocal(rawURL string) bool {
	// Read "\" as "/", as browsers do in http and https URLs, so the host is the one the browser loads.
	u, err := url.Parse(strings.ReplaceAll(rawURL, `\`, "/"))
	if err != nil {
		return false
	}
	host := strings.TrimSuffix(strings.ToLower(u.Hostname()), ".")
	return strings.HasSuffix(host, ".cluster.local") || strings.HasSuffix(host, ".svc")
}

// isStandardPage reports whether rawURL, which Parse accepted for app, is the app's normal PDF
// page. app-lib v9 builds https://{org}.apps.{hostname}/{org}/{app}/instance/{partyId}/{guid}?pdf=1&lang=nb,
// and v8 the same page as a hash route: /{org}/{app}/#/instance/{partyId}/{guid}?pdf=1&lang=nb.
func isStandardPage(rawURL string, app App) bool {
	u, err := url.Parse(rawURL)
	if err != nil {
		return false
	}

	appPath := "/" + app.Org + "/" + app.App + "/"
	path := u.EscapedPath()
	if len(path) < len(appPath) || !strings.EqualFold(path[:len(appPath)], appPath) {
		return false
	}
	pagePath := path[len(appPath):]

	var query string
	switch {
	case u.Fragment == "":
		// v9: the page is in the path.
		query = u.RawQuery
	case pagePath == "" && u.RawQuery == "" && strings.HasPrefix(u.EscapedFragment(), "/"):
		// v8: the page and its query are in the fragment.
		pagePath, query, _ = strings.Cut(u.EscapedFragment()[1:], "?")
	default:
		return false
	}

	return standardPagePath.MatchString(pagePath) && isStandardQuery(query)
}

func isStandardQuery(rawQuery string) bool {
	values, err := url.ParseQuery(rawQuery)
	if err != nil {
		return false
	}
	if pdf := values["pdf"]; len(pdf) != 1 || pdf[0] != "1" {
		return false
	}
	for key := range values {
		if !standardQueryKeys[key] {
			return false
		}
	}
	return true
}

func rejectionReason(err error) string {
	switch {
	case errors.Is(err, ErrScheme):
		return "scheme"
	case errors.Is(err, ErrUserInfoOrPort):
		return "user_info_or_port"
	case errors.Is(err, ErrHost):
		return "host"
	case errors.Is(err, ErrPath):
		return "path"
	case errors.Is(err, ErrOrgMismatch):
		return "org_mismatch"
	case errors.Is(err, ErrDotSegment):
		return "dot_segment"
	default:
		return "invalid"
	}
}

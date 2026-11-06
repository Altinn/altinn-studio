package flux

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path"
	"slices"
	"strings"
	"text/template"
	"time"

	"sigs.k8s.io/kustomize/api/krusty"
	"sigs.k8s.io/kustomize/kyaml/filesys"
)

const (
	// renovate: datasource=github-releases depName=fluxcd/flux2
	fluxVersion                  = "v2.8.8"
	fluxManifestsURL             = "https://github.com/fluxcd/flux2/releases/download/" + fluxVersion + "/manifests.tar.gz"
	fluxManifestsDownloadTimeout = time.Minute
	fluxManifestsMaxSize         = 10 << 20 // The v2.8.8 archive expands to less than 500 KiB.
	fluxNotificationController   = "notification-controller"
	fluxEventsAddr               = "http://notification-controller.$(RUNTIME_NAMESPACE).svc.cluster.local./"
)

var (
	errFluxManifestsDownload = errors.New("failed to download manifests.tar.gz")
	errFluxManifestArchive   = errors.New("invalid Flux manifest archive")
)

// These files reproduce what `flux install` generates around a release's manifests with its default options
// (flux2's pkg/manifestgen/install), for the controllers devenv installs. When fluxVersion changes, compare the
// result with `flux install --export`. Log level and source storage address already match the release defaults;
// the watch flag is made explicit to match upstream's output. Labels include pod templates but not selectors.
var fluxGeneratedFiles = map[string]string{
	"namespace.yaml": `apiVersion: v1
kind: Namespace
metadata:
  name: flux-system
  labels:
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
`,
	"node-selector.yaml": `apiVersion: apps/v1
kind: Deployment
metadata:
  name: all
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: linux
`,
	"roles/kustomization.yaml": `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: flux-system
resources:
  - rbac.yaml
nameSuffix: -flux-system
`,
}

var fluxKustomizationTemplate = template.Must(template.New("kustomization.yaml").Parse(
	`apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: flux-system
labels:
  - pairs:
      app.kubernetes.io/instance: flux-system
      app.kubernetes.io/version: "` + fluxVersion + `"
      app.kubernetes.io/part-of: flux
    includeTemplates: true
resources:
  - namespace.yaml
  - policies.yaml
  - roles
{{- range .Components }}
  - {{ . }}.yaml
{{- end }}
patches:
  - path: node-selector.yaml
    target:
      kind: Deployment
{{- range .Components }}
  - target:
      group: apps
      version: v1
      kind: Deployment
      name: {{ . }}
    patch: |-
{{- if eq . "notification-controller" }}
      - op: replace
        path: /spec/template/spec/containers/0/args/0
        value: --watch-all-namespaces=true
{{- else }}
      - op: replace
        path: /spec/template/spec/containers/0/args/0
        value: --events-addr={{ $.EventsAddr }}
      - op: replace
        path: /spec/template/spec/containers/0/args/1
        value: --watch-all-namespaces=true
{{- end }}
{{- end }}
images:
{{- range .Components }}
  - name: fluxcd/{{ . }}
    newName: ghcr.io/fluxcd/{{ . }}
{{- end }}
`))

// generateFluxManifest builds the install manifest for components from the pinned Flux release.
func generateFluxManifest(ctx context.Context, components []string) (string, error) {
	files, err := downloadFluxManifests(ctx)
	if err != nil {
		return "", err
	}
	return buildFluxManifest(files, components)
}

func downloadFluxManifests(ctx context.Context) (map[string][]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, fluxManifestsDownloadTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fluxManifestsURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create request for %s: %w", fluxManifestsURL, err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w from %s: %w", errFluxManifestsDownload, fluxManifestsURL, err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, errors.Join(
			fmt.Errorf("%w from %s, status: %s", errFluxManifestsDownload, fluxManifestsURL, resp.Status),
			resp.Body.Close(),
		)
	}

	files, err := readTarGz(resp.Body)
	if err = errors.Join(err, resp.Body.Close()); err != nil {
		return nil, fmt.Errorf("%w from %s: %w", errFluxManifestsDownload, fluxManifestsURL, err)
	}
	return files, nil
}

func readTarGz(archive io.Reader) (map[string][]byte, error) {
	gzipReader, err := gzip.NewReader(io.LimitReader(archive, fluxManifestsMaxSize))
	if err != nil {
		return nil, fmt.Errorf("open gzip: %w", err)
	}
	content, err := io.ReadAll(io.LimitReader(gzipReader, fluxManifestsMaxSize+1))
	if err = errors.Join(err, gzipReader.Close()); err != nil {
		return nil, fmt.Errorf("decompress manifests: %w", err)
	}
	if len(content) > fluxManifestsMaxSize {
		return nil, fmt.Errorf("%w: exceeds %d bytes", errFluxManifestArchive, fluxManifestsMaxSize)
	}
	files := map[string][]byte{}
	tarReader := tar.NewReader(bytes.NewReader(content))
	for {
		header, err := tarReader.Next()
		if errors.Is(err, io.EOF) {
			return files, nil
		}
		if err != nil {
			return nil, fmt.Errorf("read tar: %w", err)
		}
		if header.Typeflag != tar.TypeReg || path.Base(header.Name) != header.Name || header.Name == "." ||
			header.Name == ".." ||
			strings.Contains(header.Name, `\`) {
			return nil, fmt.Errorf("%w: unsupported entry %q", errFluxManifestArchive, header.Name)
		}
		if _, exists := files[header.Name]; exists {
			return nil, fmt.Errorf("%w: duplicate file %q", errFluxManifestArchive, header.Name)
		}
		content, err := io.ReadAll(tarReader)
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", header.Name, err)
		}
		files[header.Name] = content
	}
}

func buildFluxManifest(files map[string][]byte, components []string) (string, error) {
	fs := filesys.MakeFsInMemory()
	for name, content := range files {
		if err := fs.WriteFile(name, content); err != nil {
			return "", fmt.Errorf("write %s: %w", name, err)
		}
	}
	rbac, ok := files["rbac.yaml"]
	if !ok {
		return "", fmt.Errorf("%w: missing rbac.yaml", errFluxManifestArchive)
	}
	if err := fs.WriteFile("roles/rbac.yaml", rbac); err != nil {
		return "", fmt.Errorf("write roles/rbac.yaml: %w", err)
	}
	for name, content := range fluxGeneratedFiles {
		if err := fs.WriteFile(name, []byte(content)); err != nil {
			return "", fmt.Errorf("write %s: %w", name, err)
		}
	}

	var kustomization strings.Builder
	eventsAddr := ""
	if slices.Contains(components, fluxNotificationController) {
		eventsAddr = fluxEventsAddr
	}
	if err := fluxKustomizationTemplate.Execute(&kustomization, map[string]any{
		"Components": components,
		"EventsAddr": eventsAddr,
	}); err != nil {
		return "", fmt.Errorf("render Flux kustomization: %w", err)
	}
	if err := fs.WriteFile("kustomization.yaml", []byte(kustomization.String())); err != nil {
		return "", fmt.Errorf("write kustomization.yaml: %w", err)
	}

	resources, err := krusty.MakeKustomizer(krusty.MakeDefaultOptions()).Run(fs, ".")
	if err != nil {
		return "", fmt.Errorf("build Flux manifests: %w", err)
	}
	manifest, err := resources.AsYaml()
	if err != nil {
		return "", fmt.Errorf("render Flux manifests: %w", err)
	}
	return string(manifest), nil
}

{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}


{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "fullname" -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Detect when runtime/platform ingressRoute mode is enabled.
*/}}
{{- define "kuberneteswrapper.hasIngressRoute" -}}
{{- $ingressRoute := .Values.ingressRoute | default dict -}}
{{- $routes := $ingressRoute.routes | default (list) -}}
{{- if gt (len $routes) 0 -}}true{{- else -}}false{{- end -}}
{{- end -}}

{{/*
In ingressRoute mode we preserve the legacy service-name contract used by existing
runtime/platform helm upgrade commands.
*/}}
{{- define "kuberneteswrapper.serviceName" -}}
{{- if .Values.service.metadataName -}}
{{- .Values.service.metadataName | trunc 63 | trimSuffix "-" -}}
{{- else if eq (include "kuberneteswrapper.hasIngressRoute" .) "true" -}}
{{- printf "%s-kubernetes-api-wrapper" .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- .Release.Name -}}
{{- end -}}
{{- end -}}

{{/*
Runtime/platform ingressRoute traffic expects service port 80 by default, while studio
keeps using external port 3000.
*/}}
{{- define "kuberneteswrapper.serviceExternalPort" -}}
{{- if eq (include "kuberneteswrapper.hasIngressRoute" .) "true" -}}
{{- .Values.service.ingressRouteExternalPort -}}
{{- else -}}
{{- .Values.service.externalPort -}}
{{- end -}}
{{- end -}}

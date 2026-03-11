FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY main.go ./
RUN CGO_ENABLED=0 go build -o /fake-ansattporten .

FROM alpine:3.21
COPY --from=build /fake-ansattporten /fake-ansattporten
EXPOSE 8443
ENTRYPOINT ["/fake-ansattporten"]

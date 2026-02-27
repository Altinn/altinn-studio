package api

const swaggerDocument = `{
  "openapi": "3.0.4",
  "info": {
    "title": "Altinn Kuberneteswrapper",
    "version": "v1"
  },
  "paths": {
    "/api/v1/deployments": {
      "get": {
        "parameters": [
          {"in": "query", "name": "labelSelector", "schema": {"type": "string"}},
          {"in": "query", "name": "fieldSelector", "schema": {"type": "string"}}
        ],
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {"$ref": "#/components/schemas/DeployedResource"}
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/daemonsets": {
      "get": {
        "parameters": [
          {"in": "query", "name": "labelSelector", "schema": {"type": "string"}},
          {"in": "query", "name": "fieldSelector", "schema": {"type": "string"}}
        ],
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {"$ref": "#/components/schemas/DeployedResource"}
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "DeployedResource": {
        "type": "object",
        "properties": {
          "version": {"type": "string"},
          "release": {"type": "string"}
        }
      }
    }
  }
}`

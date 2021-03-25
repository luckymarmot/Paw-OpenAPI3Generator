// eslint-disable-next-line import/extensions
import Paw from 'types/paw'
// eslint-disable-next-line import/extensions
import OpenAPI, { MapKeyedWithString } from 'types/openapi'
import { convertEnvString } from '../paw-utils'
import URL from '../url'
import AuthConverter, { AuthConverterType } from './components/auth-converter'
import BodyConverter from './components/body-converter'
import ParametersConverter from './components/parameters-converter'
import ResponsesConverter from './components/responses-converter'
import Console from '../console'

export default class PawToOpenapiConverter {
  private readonly info: OpenAPI.InfoObject

  private readonly paths: OpenAPI.PathsObject

  private readonly components: OpenAPI.ComponentsObject

  constructor() {
    this.info = {
      title: 'OpenAPI export',
      version: Date.now().toString(),
    }
    this.paths = {}
    this.components = {
      securitySchemes: {},
    }
  }

  convert(context: Paw.Context, requests: Paw.Request[]) {
    this.generateInfo(context)
    requests.forEach((request: Paw.Request) => {
      const parametersConverter = new ParametersConverter(request)

      const parameters = parametersConverter.getParameters()

      const url = new URL(request, context, parameters)

      const body = PawToOpenapiConverter.generateBody(
        request,
        parametersConverter.getBodyContentType(),
      )
      const auth = PawToOpenapiConverter.generateAuth(
        request,
        this.components
          .securitySchemes as MapKeyedWithString<OpenAPI.SecuritySchemeObject>,
      )
      const responses = PawToOpenapiConverter.generateResponses(request)

      this.paths[url.pathname] = this.generatePathItem(
        request,
        parameters,
        url,
        body,
        auth,
        responses,
      )
    })
  }

  generateOutput(): OpenAPI.OpenAPIObject {
    return {
      openapi: '3.0.3',
      info: this.info,
      paths: this.paths,
      components: this.components,
    }
  }

  private generateInfo(context: Paw.Context): void {
    if (context.document.name) {
      this.info.title = context.document.name
    }
  }

  private generatePathItem(
    request: Paw.Request,
    parameters: OpenAPI.ParameterObject[],
    url: URL,
    body: OpenAPI.RequestBodyObject | null,
    auth: AuthConverterType,
    responses: OpenAPI.ResponsesObject,
  ): OpenAPI.PathItemObject {
    const operation: OpenAPI.OperationObject = {
      operationId: request.id,
      summary: request.name,
      description: request.description,
      responses,
    }

    if (parameters.length > 0) {
      operation.parameters = parameters
    }

    if (body) {
      operation.requestBody = body
    }

    const [authKey, authRequirement, authScheme] = auth

    if (authKey && authRequirement && authScheme) {
      if (this.components.securitySchemes) {
        this.components.securitySchemes[authKey] = authScheme
      }
      operation.security = [authRequirement]
    }

    let pathItem: OpenAPI.PathItemObject

    if (this.paths[url.pathname]) {
      pathItem = this.paths[url.pathname]
      if (
        pathItem.servers &&
        !pathItem.servers.some((server) => server.url === url.hostname)
      ) {
        pathItem.servers.push({ url: url.hostname })
      }
    } else {
      pathItem = {
        servers: [
          {
            url: url.hostname,
          },
        ],
      }
    }

    switch (request.method) {
      case 'GET':
        pathItem.get = !pathItem.get ? operation : pathItem.get
        break
      case 'POST':
        pathItem.post = !pathItem.post ? operation : pathItem.post
        break
      case 'DELETE':
        pathItem.delete = !pathItem.delete ? operation : pathItem.delete
        break
      case 'OPTIONS':
        pathItem.options = !pathItem.options ? operation : pathItem.options
        break
      case 'HEAD':
        pathItem.head = !pathItem.head ? operation : pathItem.head
        break
      case 'PATCH':
        pathItem.patch = !pathItem.patch ? operation : pathItem.patch
        break
      case 'TRACE':
        pathItem.trace = !pathItem.trace ? operation : pathItem.trace
        break
      default:
      // nothing
    }

    return pathItem
  }

  static generateBody(
    request: Paw.Request,
    bodyContentType: string,
  ): OpenAPI.RequestBodyObject | null {
    const bodyConverter = new BodyConverter(request, bodyContentType)
    return bodyConverter.getOutput()
  }

  static generateAuth(
    request: Paw.Request,
    existingSecuritySchemes: MapKeyedWithString<OpenAPI.SecuritySchemeObject>,
  ): AuthConverterType {
    const authConverter = new AuthConverter(request, existingSecuritySchemes)
    return authConverter.getOutput()
  }

  static generateResponses(request: Paw.Request): OpenAPI.ResponsesObject {
    const responsesConverter = new ResponsesConverter(request)
    return responsesConverter.getOutput()
  }
}

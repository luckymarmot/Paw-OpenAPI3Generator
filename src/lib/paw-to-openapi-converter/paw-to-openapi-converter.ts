// eslint-disable-next-line import/extensions
import Paw from '../../types-paw-api/paw';
// eslint-disable-next-line import/extensions
import OpenAPI, { MapKeyedWithString } from '../../types-paw-api/openapi';
import URL from '../url';
import ParametersConverter from './components/parameters-converter';
import AuthConverter, { AuthConverterType } from './components/auth-converter';
import ResponsesConverter from './components/responses-converter';

export default class PawToOpenapiConverter {
  private readonly info: OpenAPI.InfoObject;

  private readonly paths: OpenAPI.PathsObject;

  private readonly components: OpenAPI.ComponentsObject;

  constructor() {
    this.info = {
      title: 'OpenAPI export',
      version: Date.now().toString(),
    };
    this.paths = {};
    this.components = {
      securitySchemes: {},
      examples: {}, // to store securitySchemes values while importing generated file back to Paw
    };
  }

  convert(context: Paw.Context, requests: Paw.Request[]) {
    this.generateInfo(context);
    requests.forEach((request: Paw.Request) => {
      const parametersConverter = new ParametersConverter(request);

      const parameters = parametersConverter.getParameters();
      const url = new URL(request.urlBase, parameters);
      const body = PawToOpenapiConverter.generateBody(
        request,
        parametersConverter.getBodyContentType(),
      );
      const auth = PawToOpenapiConverter.generateAuth(
        request,
        this.components.examples as MapKeyedWithString<OpenAPI.ExampleObject>,
        parametersConverter,
      );
      const responses = PawToOpenapiConverter.generateResponses(request);

      this.paths[url.pathname] = this.generatePathItem(
        request,
        parameters,
        url,
        body,
        auth,
        responses,
      );
    });
  }

  generateOutput(): OpenAPI.OpenAPIObject {
    return {
      openapi: '3.0.3',
      info: this.info,
      paths: this.paths,
      components: this.components,
    };
  }

  private generateInfo(context: Paw.Context): void {
    if (context.document.name) {
      this.info.title = context.document.name;
    }
  }

  private generatePathItem(
    request: Paw.Request,
    parameters: OpenAPI.ParameterObject[],
    url: URL, body: (OpenAPI.RequestBodyObject | null),
    auth: AuthConverterType, responses: OpenAPI.ResponsesObject,
  ): OpenAPI.PathItemObject {
    const operation: OpenAPI.OperationObject = {
      operationId: request.id,
      summary: request.name,
      description: request.description,
      responses,
    };

    if (parameters.length > 0) {
      operation.parameters = parameters;
    }

    if (body) {
      operation.requestBody = body;
    }

    const [authKey, authRequirement, authScheme, authExample] = auth;

    if (authKey && authRequirement && authScheme && authExample) {
      if (this.components.securitySchemes) {
        this.components.securitySchemes[authKey] = authScheme;
      }
      if (this.components.examples) {
        this.components.examples[authKey] = authScheme;
      }
      operation.security = [authRequirement];
    }

    let pathItem: OpenAPI.PathItemObject;

    if (this.paths[url.pathname]) {
      pathItem = this.paths[url.pathname];
      if (pathItem.servers && !pathItem.servers.some((server) => server.url === url.hostname)) {
        pathItem.servers.push({ url: url.hostname });
      }
    } else {
      pathItem = {
        servers: [
          {
            url: url.hostname,
          },
        ],
      };
    }

    switch (request.method) {
      case 'GET':
        pathItem.get = !pathItem.get ? operation : pathItem.get;
        break;
      case 'POST':
        pathItem.post = !pathItem.post ? operation : pathItem.post;
        break;
      case 'DELETE':
        pathItem.delete = !pathItem.delete ? operation : pathItem.delete;
        break;
      case 'OPTIONS':
        pathItem.options = !pathItem.options ? operation : pathItem.options;
        break;
      case 'HEAD':
        pathItem.head = !pathItem.head ? operation : pathItem.head;
        break;
      case 'PATCH':
        pathItem.patch = !pathItem.patch ? operation : pathItem.patch;
        break;
      case 'TRACE':
        pathItem.trace = !pathItem.trace ? operation : pathItem.trace;
        break;
      default:
        // nothing
    }

    return pathItem;
  }

  static generateBody(
    request: Paw.Request,
    bodyContentType: string,
  ): OpenAPI.RequestBodyObject | null {
    if (request.body) {
      const requestBody: OpenAPI.RequestBodyObject = { content: {} };
      requestBody.content[bodyContentType] = {
        example: {
          value: request.body,
        } as OpenAPI.ExampleObject,
      };

      return requestBody;
    }

    return null;
  }

  static generateAuth(
    request: Paw.Request,
    existingExamples: MapKeyedWithString<OpenAPI.ExampleObject>,
    parametersConverter: ParametersConverter,
  ): AuthConverterType {
    const authConverter = new AuthConverter(request, existingExamples, parametersConverter);
    return authConverter.getOutput();
  }

  static generateResponses(request: Paw.Request): OpenAPI.ResponsesObject {
    const responsesConverter = new ResponsesConverter(request);
    return responsesConverter.getOutput();
  }
}

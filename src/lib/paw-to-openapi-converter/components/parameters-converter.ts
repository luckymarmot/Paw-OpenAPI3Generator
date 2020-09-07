// eslint-disable-next-line import/extensions
import Paw from '../../../types-paw-api/paw';
// eslint-disable-next-line import/extensions
import OpenAPI, { NonRequiredLabel } from '../../../types-paw-api/openapi';

export default class ParametersConverter {
  private request: Paw.Request;

  private readonly parameters: OpenAPI.ParameterObject[];

  private bodyContentType: string = 'text/plain';

  constructor(request: Paw.Request) {
    this.request = request;
    this.parameters = [];

    this.parseQueryParams();
    this.parseHeaders();
    this.parsePathParams();
  }

  getBodyContentType() {
    return this.bodyContentType;
  }

  getParameters(): OpenAPI.ParameterObject[] {
    return this.parameters;
  }

  private parseQueryParams(): void {
    this.request.urlParametersNames.forEach((paramName: string) => {
      const schema: OpenAPI.SchemaObject = {
        type: 'string',
        default: this.request.urlParameters[paramName] ?? '',
        description: this.request.getVariableByName(paramName)?.description ?? '',
      };

      this.parameters.push({
        name: paramName,
        in: 'query',
        schema,
      });
    });
  }

  private parseHeaders(): void {
    Object.entries(this.request.headers).forEach(([headerName, headerValue]) => {
      if (headerName.toLowerCase() === 'cookie') {
        this.parseCookies((headerValue ?? '') as string);
      } else {
        const schema: OpenAPI.SchemaObject = {
          type: 'string',
          default: headerValue ?? '',
          description: this.request.getVariableByName(headerName)?.description ?? '',
        };

        if (headerName.toLowerCase() === 'content-type' && schema.default !== '') {
          if (schema.default.toLowerCase().indexOf('application/json') >= 0) {
            this.bodyContentType = 'application/json';
          } else if (schema.default.toLowerCase().indexOf('application/xml') >= 0) {
            this.bodyContentType = 'application/xml';
          } else if (schema.default.toLowerCase().indexOf('application/x-www-form-urlencoded') >= 0) {
            this.bodyContentType = 'application/x-www-form-urlencoded';
          } else if (schema.default.toLowerCase().indexOf('multipart/form-data') >= 0) {
            this.bodyContentType = 'multipart/form-data';
          }
        }

        this.parameters.push({
          name: headerName,
          in: 'header',
          schema,
        });
      }
    });
  }

  private parseCookies(cookiesString: string): void {
    // eslint-disable-next-line array-callback-return
    cookiesString.split('; ').map((cookieString) => {
      const [cookieName, cookieValue] = cookieString.split('=');

      const schema: OpenAPI.SchemaObject = {
        type: 'string',
        default: cookieValue,
      };

      const newParam: OpenAPI.ParameterObject = {
        name: cookieName,
        in: 'cookie',
        schema,
      };

      this.parameters.push(newParam);
    });
  }

  private parsePathParams(): void {
    if (this.request.variables.length > 0) {
      this.request.variables.forEach((variable) => {
        if (variable && !this.parameters.some((param) => param.name === variable.name)) {
          const newParam: OpenAPI.ParameterObject = {
            name: variable.name,
            in: 'path',
            required: true,
          };

          const variableValue = variable.getCurrentValue();

          if (!variable.required) {
            newParam.example = { // just to inform Paw while importing back that exported file
              summary: NonRequiredLabel,
              value: true,
            };
          }

          newParam.schema = {
            type: 'string',
            default: variableValue ?? '',
            description: variable.description ?? '',
          };

          this.parameters.push(newParam);
        }
      });
    }
  }
}

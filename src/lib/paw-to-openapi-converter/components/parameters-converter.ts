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
    this.parsePathParams();
    this.parseHeaders();
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
      };

      this.parameters.push({
        name: paramName,
        in: 'header',
        schema,
      });
    });
  }

  private parsePathParams(): void {
    if (this.request.variables.length > 0) {
      this.request.getVariablesNames().forEach((variableName) => {
        const variable = this.request.getVariableByName(variableName);
        if (variable) {
          const newParam: OpenAPI.ParameterObject = {
            name: variableName,
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
          };

          this.parameters.push(newParam);
        }
      });
    }
  }

  private parseHeaders(): void {
    this.request.headersNames.forEach((headerName: string) => {
      if (headerName.toLowerCase() === 'cookie') {
        this.parseCookies((this.request.headers[headerName] ?? '') as string);
      } else {
        const schema: OpenAPI.SchemaObject = {
          type: 'string',
          default: this.request.headers[headerName] ?? '',
        };

        if (headerName.toLowerCase() === 'content-type' && schema.default !== '') {
          if (schema.default.toLowerCase().indexOf('application/json') >= 0) {
            this.bodyContentType = 'application/json';
          } else if (schema.default.toLowerCase().indexOf('application/xml') >= 0) {
            this.bodyContentType = 'application/xml';
          } else if (schema.default.toLowerCase().indexOf('application/x-www-form-urlencoded') >= 0) {
            this.bodyContentType = 'application/x-www-form-urlencoded';
          } else if (schema.default.toLowerCase().indexOf('application/form-data') >= 0) {
            this.bodyContentType = 'application/form-data';
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
}

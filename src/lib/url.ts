// eslint-disable-next-line import/extensions
import OpenAPI from '../types-paw-api/openapi';

export default class URL {
  hostname: string;

  pathname: string;

  port: string;

  fullUrl: string;

  constructor(url: string, parameters: OpenAPI.ParameterObject[]) {
    this.fullUrl = url;

    const match = url.match(/^([^:]+):\/\/([^:/]+)(?::([0-9]*))?(?:(\/.*))?\??$/i);

    if (match) {
      if (match[2]) {
        let host = 'http';
        if (match[1]) {
          // eslint-disable-next-line prefer-destructuring
          host = match[1];
        }

        this.hostname = URL.addSlashAtEnd(`${host}://${match[2]}`);
      }

      if (match[3]) {
        // eslint-disable-next-line prefer-destructuring
        this.port = match[3];
      }

      if (match[4]) {
        this.pathname = decodeURI(URL.addSlashAtEnd(match[4].replace(new RegExp('//', 'g'), '/').replace(new RegExp('\\?.*'), '')));
      } else {
        this.pathname = '/';
      }
    }

    this.parseParameters(parameters);
  }

  public replacePathParam(variableValue: string, variableName: string): void {
    if (this.pathname.indexOf(`/${variableValue}/`) < 0) {
      throw new Error('Param cannot be replaced');
    }

    this.pathname = this.pathname.replace(`/${variableValue}/`, `/{${variableName}}/`);
  }

  public addPathParam(variableName: string): void {
    this.pathname = `${this.pathname}{${variableName}}/`;
  }

  private parseParameters(parameters: OpenAPI.ParameterObject[]) {
    parameters.forEach((param) => {
      if (
        param.in === 'path'
        && param.name
        && typeof (param?.schema as OpenAPI.SchemaObject).default !== 'undefined'
        && this.pathname.indexOf(`{${param.name}}`) < 0
        && this.hostname.indexOf(`{${param.name}}`) < 0
      ) {
        const paramName = param.name;
        const paramValue = (param.schema as OpenAPI.SchemaObject).default;
        if (paramValue !== null && (paramValue === '0' || (paramValue as string).length > 0)) {
          try {
            this.replacePathParam(paramValue as string, paramName);
          } catch (error) {
            this.addPathParam(paramName);
          }
        } else {
          try {
            this.replacePathParam('', paramName); // hacky way to try insert empty value in correct place in URL -> try replace "//" with "/{param_name}/"
          } catch (error) {
            this.addPathParam(paramName);
          }
        }
      }
    });
  }

  static addSlashAtEnd(variable: string): string {
    if (variable[variable.length - 1] !== '/') {
      return `${variable}/`;
    }

    return variable;
  }
}

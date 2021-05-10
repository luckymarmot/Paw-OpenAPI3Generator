import { OpenAPIV3 } from 'openapi-types'
import Paw from 'types/paw'
import EnvironmentManager from './environment'
import { convertEnvString } from './dynamic-values'

export interface PawURLOptions {
  openApi: OpenAPIV3.Document
  pathItem: OpenAPIV3.PathItemObject
  envManager: EnvironmentManager
  pathName: string
  request: Paw.Request
}

export default class PawURL {
  public hostname: string = 'https://echo.paw.cloud'
  public pathname: string
  public port: string
  public fullUrl: string

  constructor(
    request: Paw.Request,
    context: Paw.Context,
    parameters: OpenAPIV3.ParameterObject[],
  ) {
    const getURL = convertEnvString(
      request.getUrl(true) as DynamicString,
      context,
    )

    this.fullUrl = this.createValidURL(getURL)

    const urlRegex = /^([^:]+):\/\/([^:/]+)(?::([0-9]*))?(?:(\/.*))?\??$/i

    let match = this.fullUrl.match(urlRegex)

    if (match) {
      this.parseMatches(match)
    } else {
      this.fullUrl = request.urlBase
      match = this.fullUrl.match(urlRegex)
      this.parseMatches(match)
    }

    this.parseParameters(parameters)
  }

  public replacePathParam(variableValue: string, variableName: string): void {
    if (this.pathname.indexOf(`/${variableValue}/`) < 0) {
      throw new Error('Param cannot be replaced')
    }

    this.pathname = this.pathname.replace(
      `/${variableValue}/`,
      `/{${variableName}}/`,
    )
  }

  public addPathParam(variableName: string): void {
    this.pathname = `${this.pathname}{${variableName}}/`
  }

  private parseMatches(match: RegExpMatchArray | null) {
    if (match) {
      if (match[2]) {
        let host = 'http'
        if (match[1]) {
          // eslint-disable-next-line prefer-destructuring
          host = match[1]
        }

        this.hostname = PawURL.addSlashAtEnd(`${host}://${match[2]}`)
      }

      if (match[3]) {
        // eslint-disable-next-line prefer-destructuring
        this.port = match[3]
      }

      if (match[4]) {
        this.pathname = decodeURI(
          PawURL.addSlashAtEnd(
            match[4]
              .replace(new RegExp('//', 'g'), '/')
              .replace(new RegExp('\\?.*'), ''),
          ),
        )
      } else {
        this.pathname = '/'
      }
    }
  }

  private parseParameters(parameters: OpenAPIV3.ParameterObject[]) {
    parameters.forEach((param) => {
      if (
        param.in === 'path' &&
        param.name &&
        typeof (param?.schema as OpenAPIV3.SchemaObject).default !==
          'undefined' &&
        this.pathname.indexOf(`{${param.name}}`) < 0 &&
        this.hostname.indexOf(`{${param.name}}`) < 0
      ) {
        const paramName = param.name
        const paramValue = (param.schema as OpenAPIV3.SchemaObject).default
        if (
          paramValue !== null &&
          (paramValue === '0' || (paramValue as string).length > 0)
        ) {
          try {
            this.replacePathParam(paramValue as string, paramName)
          } catch (error) {
            this.addPathParam(paramName)
          }
        } else {
          try {
            this.replacePathParam('', paramName) // hacky way to try insert empty value in correct place in URL -> try replace "//" with "/{param_name}/"
          } catch (error) {
            this.addPathParam(paramName)
          }
        }
      }
    })
  }

  private createValidURL(url: string): string {
    try {
      return new URL(url).href
    } catch (error) {
      return new URL(url, this.hostname).href
    }
  }

  static addSlashAtEnd(variable: string): string {
    if (variable[variable.length - 1] !== '/') {
      return `${variable}/`
    }

    return variable
  }
}

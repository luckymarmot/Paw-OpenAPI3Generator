import { Md5 } from 'md5-typescript'
// eslint-disable-next-line import/extensions
import Paw from 'types/paw'
// eslint-disable-next-line import/extensions
import OpenAPI, {
  MapKeyedWithString,
  BasicCredentialsLabel,
  OAuth2CredentialsLabel,
} from 'types/openapi'

export type AuthConverterType = [
  string,
  OpenAPI.SecurityRequirementObject,
  OpenAPI.SecuritySchemeObject,
]

export default class AuthConverter {
  private readonly request: Paw.Request

  private authFound: boolean

  private readonly existingSecuritySchemes: MapKeyedWithString<OpenAPI.SecuritySchemeObject>

  private key: string

  private requirement: OpenAPI.SecurityRequirementObject

  private scheme: OpenAPI.SecuritySchemeObject

  constructor(
    request: Paw.Request,
    existingSecuritySchemes: MapKeyedWithString<OpenAPI.SecuritySchemeObject>,
  ) {
    this.request = request
    this.authFound = false
    this.existingSecuritySchemes = existingSecuritySchemes

    this.parseBasicAuth()
    if (!this.authFound) {
      this.parseOAuth2Auth()
    }
    if (!this.authFound) {
      this.parseHttpBearerAuth()
    }
  }

  getOutput(): AuthConverterType {
    return [this.key, this.requirement, this.scheme]
  }

  private parseBasicAuth(): void {
    if (this.request.httpBasicAuth) {
      this.key = BasicCredentialsLabel
      this.requirement = {}
      this.scheme = {
        type: 'http',
        scheme: 'basic',
      }

      this.requirement[this.key] = []

      this.authFound = true
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private parseHttpBearerAuth(): void {
    const authHeader = this.request.getHeaderByName('authorization')

    if (authHeader && (authHeader as string).match(/bearer /i)) {
      this.requirement = {}
      this.key = 'BearerAuth'

      this.scheme = {
        type: 'http',
        scheme: 'bearer',
      }

      this.requirement[this.key] = []

      this.authFound = true
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private parseOAuth2Auth(): void {
    const { oauth2 } = this.request

    if (oauth2) {
      this.requirement = {}
      const keyHash = AuthConverter.generateKeyHash(
        oauth2.grant_type as string,
        oauth2.authorization_uri as string,
        oauth2.access_token_uri as string,
        oauth2.scope as string,
      )
      this.key = `${OAuth2CredentialsLabel} ${keyHash}`
      let sameAuthFound = false

      if (
        this.existingSecuritySchemes &&
        typeof this.existingSecuritySchemes[this.key] !== 'undefined'
      ) {
        sameAuthFound = true
        this.scheme = this.existingSecuritySchemes[this.key]
      }

      if (!sameAuthFound) {
        const grantType: string = AuthConverter.camelCaseToCapital(
          oauth2.grant_type as string,
        )
        const scopes = AuthConverter.convertScopes(oauth2.scope as string)

        const flows: MapKeyedWithString<OpenAPI.OAuthFlowObject> = {}
        flows[grantType] = {
          authorizationUrl: oauth2.authorization_uri,
          tokenUrl: oauth2.access_token_uri,
          scopes,
        } as OpenAPI.OAuthFlowObject

        this.scheme = {
          type: 'oauth2',
          flows,
        }
      }

      this.requirement[this.key] = []

      this.authFound = true
    }
  }

  static camelCaseToCapital(string: string) {
    return string.replace(/[_][a-z]/g, (snakeWithLetter) =>
      snakeWithLetter.toUpperCase().replace('_', ''),
    )
  }

  static convertScopes(pawScopes: string) {
    const openAPIScopes: MapKeyedWithString<string> = {}

    pawScopes.split(' ').forEach((singlePawScope) => {
      openAPIScopes[singlePawScope] = singlePawScope
    })

    return openAPIScopes
  }

  static generateKeyHash(
    grantType: string,
    authUrl: string,
    tokenUrl: string,
    scopes: string,
  ) {
    return Md5.init(grantType + authUrl + tokenUrl + scopes)
  }
}

import Paw from "../../../types-paw-api/paw"
import OpenAPI, {MapKeyedWithString, BasicCredentialsLabel} from "../../../types-paw-api/openapi"
import ParametersConverter from "./parameters-converter";

export type AuthConverterType = [string, OpenAPI.SecurityRequirementObject, OpenAPI.SecuritySchemeObject, OpenAPI.ExampleObject]

export default class AuthConverter {
  private request: Paw.Request
  private authFound: boolean
  private readonly existingExamples: MapKeyedWithString<OpenAPI.ExampleObject>
  private key: string
  private requirement: OpenAPI.SecurityRequirementObject
  private scheme: OpenAPI.SecuritySchemeObject
  private example: OpenAPI.ExampleObject

  constructor(request: Paw.Request, existingExamples: MapKeyedWithString<OpenAPI.ExampleObject>, parametersConverters: ParametersConverter) {
    this.request = request
    this.authFound = false
    this.existingExamples = existingExamples

    this.parseBasicAuth()
    !this.authFound && this.parseHttpBearerAuth()
    !this.authFound && this.parseApiKeyAuth(parametersConverters)
    !this.authFound && this.parseOAuth2Auth()
    !this.authFound && this.parseOpenIdConnectAuth()
  }

  getOutput(): AuthConverterType {
    return [
      this.key,
      this.requirement,
      this.scheme,
      this.example
    ]
  }

  private parseBasicAuth() {
    if (this.request.httpBasicAuth) {
      this.key = ''
      this.requirement = {}
      let found: boolean = false

      if (this.existingExamples) {
        Object.entries(this.existingExamples).forEach(([key, example]) => {
          if (
            !found
            && this.request.httpBasicAuth // I had to add that because TypeScript do not recognize that this value has been already checked few lines above
            && (example as OpenAPI.ExampleObject).summary
            && (example as OpenAPI.ExampleObject).summary === BasicCredentialsLabel
            && (example as OpenAPI.ExampleObject).value?.username
            && (example as OpenAPI.ExampleObject).value?.username === this.request.httpBasicAuth.username
            && (example as OpenAPI.ExampleObject).value?.password
            && (example as OpenAPI.ExampleObject).value?.password === this.request.httpBasicAuth.password
          ) {
            found = true
            this.key = key.toString()
          }
        })
      }

      if (!found) {
        this.key = `BasicAuth${this.existingExamples.length > 0 ? `_${this.existingExamples.length}` : ''}`

        const securityScheme: OpenAPI.SecuritySchemeObject = {
          type: "http",
          scheme: "basic"
        }

        const securityExample: OpenAPI.ExampleObject = {
          summary: BasicCredentialsLabel,
          value: this.request.httpBasicAuth
        }

        this.scheme = securityScheme
        this.example = securityExample
      }

      this.requirement[this.key] = []

      this.authFound = true;
    }
  }

  private parseHttpBearerAuth() {
    /**
     * @TODO
     */
  }

  private parseApiKeyAuth(parametersConverters: ParametersConverter) {
    /**
     * @TODO
     * - in query
     * - in header
     * - in cookie
     */
  }

  private parseOAuth2Auth() {
    /**
     * @TODO
     */
  }

  private parseOpenIdConnectAuth() {
    /**
     * @TODO
     */
  }
}

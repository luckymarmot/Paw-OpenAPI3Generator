// eslint-disable-next-line import/extensions
import Paw from '../../../types-paw-api/paw';
// eslint-disable-next-line import/extensions
import OpenAPI, { MapKeyedWithString, BasicCredentialsLabel } from '../../../types-paw-api/openapi';
import ParametersConverter from './parameters-converter';

export type AuthConverterType = [
  string,
  OpenAPI.SecurityRequirementObject,
  OpenAPI.SecuritySchemeObject,
  OpenAPI.ExampleObject
];

export default class AuthConverter {
  private request: Paw.Request;

  private authFound: boolean;

  private readonly existingExamples: MapKeyedWithString<OpenAPI.ExampleObject>;

  private key: string;

  private requirement: OpenAPI.SecurityRequirementObject;

  private scheme: OpenAPI.SecuritySchemeObject;

  private example: OpenAPI.ExampleObject;

  constructor(
    request: Paw.Request,
    existingExamples: MapKeyedWithString<OpenAPI.ExampleObject>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    parametersConverters: ParametersConverter,
  ) {
    this.request = request;
    this.authFound = false;
    this.existingExamples = existingExamples;

    this.parseBasicAuth();
    if (!this.authFound) {
      this.parseHttpBearerAuth();
    }
    if (!this.authFound) {
      // this.parseApiKeyAuth(parametersConverters);
    }
    if (!this.authFound) {
      this.parseOAuth2Auth();
    }
  }

  getOutput(): AuthConverterType {
    return [
      this.key,
      this.requirement,
      this.scheme,
      this.example,
    ];
  }

  private parseBasicAuth() {
    if (this.request.httpBasicAuth) {
      this.key = '';
      this.requirement = {};
      let found: boolean = false;

      if (this.existingExamples) {
        Object.entries(this.existingExamples).forEach(([key, example]) => {
          const {
            summary,
            value,
          } = example as OpenAPI.ExampleObject;

          if (
            !found
            && this.request.httpBasicAuth
            && summary
            && summary === BasicCredentialsLabel
            && value?.username
            && value?.username === this.request.httpBasicAuth.username
            && value?.password
            && value?.password === this.request.httpBasicAuth.password
          ) {
            found = true;
            this.key = key.toString();
          }
        });
      }

      if (!found) {
        this.key = `BasicAuth${this.existingExamples.length > 0 ? `_${this.existingExamples.length}` : ''}`;

        const securityExample: OpenAPI.ExampleObject = {
          summary: BasicCredentialsLabel,
          value: this.request.httpBasicAuth,
        };

        this.scheme = {
          type: 'http',
          scheme: 'basic',
        };
        this.example = securityExample;
      }

      this.requirement[this.key] = [];

      this.authFound = true;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private parseHttpBearerAuth() {
    const authHeader = this.request.getHeaderByName('authorization');
    if (authHeader) {
      this.key = 'BearerAuth';

      this.scheme = {
        type: 'http',
        scheme: 'bearer',
      };

      // bearer header is parsed with other headers

      this.requirement[this.key] = [];

      this.authFound = true;
    }
  }

  // private parseApiKeyAuth(parametersConverters: ParametersConverter) {
  //   /**
  //    * @TODO
  //    * - in query
  //    * - in header
  //    * - in cookie
  //    */
  // }

  // eslint-disable-next-line class-methods-use-this
  private parseOAuth2Auth() {
    /**
     * @TODO
     */
  }
}

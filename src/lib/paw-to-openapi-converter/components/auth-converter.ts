// eslint-disable-next-line import/extensions
import Paw from '../../../types-paw-api/paw';
// eslint-disable-next-line import/extensions
import OpenAPI, { MapKeyedWithString, BasicCredentialsLabel, OAuth2CredentialsLabel } from '../../../types-paw-api/openapi';

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
  ) {
    this.request = request;
    this.authFound = false;
    this.existingExamples = existingExamples;

    this.parseBasicAuth();
    if (!this.authFound) {
      this.parseOAuth2Auth();
    }
    if (!this.authFound) {
      this.parseHttpBearerAuth();
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

  private parseBasicAuth(): void {
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
  private parseHttpBearerAuth(): void {
    const authHeader = this.request.getHeaderByName('authorization');

    if (authHeader && (authHeader as string).match(/bearer /i)) {
      this.requirement = {};
      this.key = 'BearerAuth';

      this.scheme = {
        type: 'http',
        scheme: 'bearer',
      };

      this.requirement[this.key] = [];

      this.authFound = true;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private parseOAuth2Auth(): void {
    const { oauth2 } = this.request;

    if (oauth2) {
      const {
        scope,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        authorization_uri,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        access_token_uri,
        ...restOauth2Values
      } = oauth2;

      this.requirement = {};
      this.key = 'OAuth2';
      const grantType: string = AuthConverter.camelCaseToCapital(oauth2.grant_type as string);
      const scopes: MapKeyedWithString<string> = {};

      (scope as string).split(' ').forEach((singleScope) => {
        scopes[singleScope] = singleScope;
      });

      const flows: MapKeyedWithString<OpenAPI.OAuthFlowObject> = {};
      flows[grantType] = {
        authorizationUrl: oauth2.authorization_uri,
        tokenUrl: oauth2.access_token_uri,
        scopes,
      } as OpenAPI.OAuthFlowObject;

      const securityExample: OpenAPI.ExampleObject = {
        summary: OAuth2CredentialsLabel,
        value: restOauth2Values,
      };

      this.scheme = {
        type: 'oauth2',
        flows,
      };
      this.example = securityExample;

      this.requirement[this.key] = [];

      this.authFound = true;
    }
  }

  static camelCaseToCapital(string: string) {
    return string.replace(/[_][a-z]/g, (snakeWithLetter) => snakeWithLetter.toUpperCase().replace('_', ''));
  }
}

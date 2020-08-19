// eslint-disable-next-line import/extensions
import Paw from '../../../types-paw-api/paw';
// eslint-disable-next-line import/extensions
import OpenAPI, { MapKeyedWithString } from '../../../types-paw-api/openapi';

export default class ResponsesConverter {
  private request: Paw.Request;

  private readonly responses: OpenAPI.ResponsesObject;

  constructor(request: Paw.Request) {
    this.request = request;
    this.responses = {
      default: {
        description: 'Default response',
      } as OpenAPI.ResponseObject,
    } as OpenAPI.ResponsesObject;

    this.parsePawResponses();
  }

  getOutput(): OpenAPI.ResponsesObject {
    return this.responses;
  }

  private parsePawResponses() {
    const lastExchange = this.request.getLastExchange();
    if (lastExchange) {
      const content = {} as MapKeyedWithString<OpenAPI.MediaTypeObject>;
      const description = `Response ${lastExchange.responseStatusCode}`;
      const headers = {} as MapKeyedWithString<OpenAPI.HeaderObject>;

      Object.entries(lastExchange.responseHeaders).forEach(([headerName, headerContent]) => {
        headers[headerName] = {
          schema: {
            default: headerContent,
          },
        };

        if (headerName.toLowerCase() === 'content-type') {
          content[headerContent.replace(/;.+/, '')] = {
            schema: {
              default: lastExchange.responseBody,
            },
          };
        }
      });

      this.responses[lastExchange.responseStatusCode] = {
        content, description, headers,
      } as OpenAPI.ResponseObject;
    }
  }
}

// eslint-disable-next-line import/extensions
import Paw from '../../../types-paw-api/paw';
// eslint-disable-next-line import/extensions
import OpenAPI from '../../../types-paw-api/openapi';

export default class BodyConverter {
  private request: Paw.Request;

  private body: OpenAPI.RequestBodyObject;

  constructor(request: Paw.Request, bodyContentType: string) {
    this.request = request;

    this.parseBody(bodyContentType);
  }

  getOutput(): OpenAPI.ResponsesObject {
    return this.body;
  }

  private parseBody(bodyContentType: string): void {
    let body = '';

    switch (bodyContentType.toLowerCase()) {
      case 'application/json':
        body = this.request.jsonBody;
        break;
      case 'application/x-www-form-urlencoded':
        body = this.request.urlEncodedBody;
        break;
      case 'multipart/form-data':
        body = this.request.multipartBody;
        break;
      default:
        body = this.request.body;
    }

    if (body) {
      this.body = { content: {} };
      this.body.content[bodyContentType] = {
        example: {
          value: body,
        } as OpenAPI.ExampleObject,
      };
    }
  }
}

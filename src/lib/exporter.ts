import Paw from 'types/paw'
import config from '../paw.config'
import {
  buildDocumentInfoObject,
  buildPathItemObject,
  buildServerObject,
} from './converter'

const { identifier, title, inputs, fileExtensions } = config

/**
 * @class
 * OpenAPIv3Generator
 */
export default class OpenAPIv3Generator implements Paw.Generator {
  public static title = title
  public static inputs = inputs
  public static identifier = identifier
  public static fileExtensions = [...fileExtensions]

  /**
   * @method generate
   * @summary
   *  - {@link https://paw.cloud/docs/extensions/create-code-generator}
   * @param {Object<Paw.Context>} context -
   * @param {Array<Paw.Request>} requests
   * @param {Object<Paw.ExtensionOption>} options
   */
  public generate(
    context: Paw.Context,
    requests: Paw.Request[],
    options: Paw.ExtensionOption,
  ): string {
    const info = buildDocumentInfoObject(context)
    const servers = buildServerObject(requests, context) || []
    const paths = buildPathItemObject(requests, context)

    return JSON.stringify(
      {
        openapi: '3.0.3',
        info,
        servers,
        paths,
      },
      null,
      2,
    )
  }
}

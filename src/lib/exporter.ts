import { OpenAPIV3 } from 'openapi-types'
import Paw from 'types/paw'
import config from '../paw.config'
import {
  buildDocumentInfoObject,
  buildPathItemObject,
  buildSecurityShemeObject,
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
    const securitySchemes = buildSecurityShemeObject(requests)

    const components: OpenAPIV3.ComponentsObject = {}
    if (Object.keys(securitySchemes).length > 0) {
      components.securitySchemes = { ...securitySchemes }
    }

    return JSON.stringify(
      {
        openapi: '3.0.3',
        info,
        servers,
        paths,
        components,
      },
      null,
      2,
    )
  }
}

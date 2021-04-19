import Paw from 'types/paw'
import { logger } from 'utils'
import config from '../paw.config'

const { identifier, title, inputs, fileExtensions } = config

/**
 */
export default class OpenAPIv3Generator implements Paw.Generator {
  public static title = title
  public static inputs = inputs
  public static identifier = identifier
  public static fileExtensions = [...fileExtensions]
  public static languageHighlighter = fileExtensions[0]

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
    logger.log(requests)
    return ''
  }
}

/* eslint-disable class-methods-use-this */
import Yaml from 'yaml'
// eslint-disable-next-line import/extensions
import Paw from 'types/paw'
import Console from 'lib/console'
import PawToOpenapiConverter from './lib/paw-to-openapi-converter/paw-to-openapi-converter'
import extension from './config.json'

const {
  title,
  identifier,
  fileExtension,
  languageHighlighter,
  debug,
  options,
} = extension

/**
 * @TODO
 * Can it be done manually from some input?
 */
const exportFormat = 'json'
// const exportFormat = 'yaml'

class OpenAPIGenerator implements Paw.Generator {
  static title = title
  static identifier = identifier
  static fileExtension = fileExtension
  static languageHighlighter = languageHighlighter
  public options = options
  public context: Paw.Context
  public converter: PawToOpenapiConverter = new PawToOpenapiConverter()
  public debug: boolean = debug

  public generate(
    context: Paw.Context,
    requests: Paw.Request[],
    options: Paw.ExtensionOption,
  ): string {
    if (this.debug) {
      const allPawData = {
        context,
        requests,
        options,
      }
      return Console.stringifyWithCyclicSupport(allPawData)
    }

    this.context = context
    this.converter.convert(context, requests)

    const openApi = this.converter.generateOutput()
    if (OpenAPIGenerator.fileExtension === 'json') {
      return JSON.stringify(openApi, null, 2)
    }
    return Yaml.stringify(openApi)
  }
}

registerCodeGenerator(OpenAPIGenerator)

/* eslint-disable class-methods-use-this */
import Yaml from 'yaml';
// eslint-disable-next-line import/extensions
import Paw from './types-paw-api/paw';
import Console from './lib/console';
import PawToOpenapiConverter from './lib/paw-to-openapi-converter/paw-to-openapi-converter';

/**
 * @TODO
 * Can it be done manually from some input?
 */
const exportFormat = 'json';
// const exportFormat = 'yaml'

class OpenAPIGenerator implements Paw.Generator {
  static identifier = 'com.luckymarmot.PawExtensions.OpenAPIGenerator';

  static title = 'OpenAPI 3.0';

  static languageHighlighter = exportFormat;

  static fileExtension = exportFormat;

  context: Paw.Context;

  converter: PawToOpenapiConverter = new PawToOpenapiConverter();

  debug: boolean = false; // output all Paw data

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public generate(
    context: Paw.Context,
    requests: Paw.Request[],
    options: Paw.ExtensionOption,
  ): string {
    if (this.debug) {
      const allPawData = {
        context, requests, options,
      };

      return Console.stringifyWithCyclicSupport(allPawData);
    }

    this.context = context;

    this.converter.convert(context, requests);

    const openApi = this.converter.generateOutput();

    if (OpenAPIGenerator.fileExtension === 'json') {
      return JSON.stringify(openApi, null, 2);
    }
    return Yaml.stringify(openApi);
  }
}

registerCodeGenerator(OpenAPIGenerator);

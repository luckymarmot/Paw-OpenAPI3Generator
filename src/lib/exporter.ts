import { OpenAPIV3 } from 'openapi-types'
import Paw from 'types/paw'
import { convertEnvString, logger, PawURL } from 'utils'
import config from '../paw.config'
import {
  buildDocumentInfoObject,
  buildPathItemObject,
  buildRequestBodyObject,
  buildResponseObject,
  buildServerObject,
} from './converter'

import ParametersConverter from './param-converter'

const { identifier, title, inputs, fileExtensions } = config

/**
 * @class OpenAPIv3Generator
 * @description
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

  /**
   * @method getPathItemObject
   * @summary
   *
   * @param {Object<Paw.Request>} request
   * @returns {Object<OpenAPIV3.PathItemObject>}
   */
  private getPathItemObject(
    request: Paw.Request[],
    context: Paw.Context,
  ): OpenAPIV3.PathItemObject | null {
    const getPaths = [...request]
      .map((item: Paw.Request) => {
        const { method, description, id } = item

        const paramCoverter = new ParametersConverter(item)
        const parameters = paramCoverter.getParameters()
        const requestURL = new PawURL(item, context, parameters)

        const getRequestPath = requestURL.pathname
        const getPathPrefix = new RegExp(/(\/api\/v\d+)/, 'g')

        const requestBody:
          | OpenAPIV3.RequestBodyObject
          | undefined = buildRequestBodyObject(item)
        const responses:
          | OpenAPIV3.ResponsesObject
          | undefined = buildResponseObject(item)

        const output = {
          tags: [],
          summary: description,
          description,
          method,
          path: getPathPrefix.test(getRequestPath)
            ? getRequestPath.replace(getPathPrefix, '').replace(/\/$/, '')
            : getRequestPath,
          operationId: id,
          parameters,
          requestBody,
          security: [],
          responses,
        }

        return output
      })
      .reduce((accumulator: any, requestItem) => {
        accumulator[requestItem.path] = accumulator[requestItem.path] || {}

        const key = (requestItem.method as string).toLowerCase()
        accumulator[requestItem.path][key] = { ...requestItem }

        delete accumulator[requestItem.path][key].path
        delete accumulator[requestItem.path][key].method
        return accumulator
      }, Object.create({}))
    return getPaths || null
  }
}

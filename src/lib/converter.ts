import { OpenAPIV3 } from 'openapi-types'
import toJsonSchema from 'to-json-schema'
import qs from 'query-string'
import Paw from 'types/paw'
import { logger, PawURL } from 'utils'
import ParametersConverter from './param-converter'

type PawToOAS3 = OpenAPIV3.OperationObject & {
  path: string
  method: string
}

/**
 * @private
 * @function extendToJsonSchema
 * @summary
 *  a function that includes missing key+value that makes up a requestObject schema and
 *  also includes exampes based.
 *
 * @todo:
 *  - add proper typings please
 *  - add mechanism to detect date-time
 *
 * @param {Object} refSchema - a schema data
 * @param {Object} reference - an object where refSchema is built from
 * @returns {Object}
 */
function extendToJsonSchema(refSchema: any, reference: any): any {
  const schema = { ...refSchema }
  if (refSchema.type === 'object') {
    const props = schema.properties

    if (!props) return schema

    Object.keys(props).forEach((i: string) => {
      if (props[i].type === 'array') {
        props[i].type =
          reference[i].length > 0 ? typeof reference[i][0] : 'string'

        if (props[i].type === 'array') {
          props[i].items = {
            type: reference[i].length > 0 ? typeof reference[i][0] : 'string',
          }
        }
      }

      if (props[i]['type'] === 'integer') {
        props[i].format = 'int64'
        props[i].example = reference[i]
      }

      if (props[i].type === 'string') {
        props[i].example = reference[i] || ''
        delete props[i].format
      }

      if (props[i].type === 'object') {
        extendToJsonSchema(props[i], reference[i])
      }
    })
  }

  return schema
}

/**
 * @private
 * @function jsonParseCheck
 * @summary
 * safely parse json string and or query string into objects. this utility
 * fallsback to string, in which should match a `text/plain` content type.
 * @param {String} str - a valid json string or not?
 * @returns {Object<unknown>|String}
 */
function jsonParseCheck(str: string): any {
  // const isQueryString = new RegExp(
  //   '^?([w-]+(=[w-]*)?(&[w-]+(=[w-]*)?)*)?$',
  //   'g',
  // )
  try {
    return JSON.parse(str)
  } catch (error) {
    // return isQueryString.test(str) ? qs.parse(str) : str
    return str
  }
}

/**
 * @function buildDocumentInfoObject
 * @summary a function that builds openapi document info object
 * @param {Object<Paw.Context>} context - an instance of Paw Context object.
 * @returns {Object<OpenAPIV3.InfoObject>}
 */
export function buildDocumentInfoObject(
  context: Paw.Context,
): OpenAPIV3.InfoObject {
  const { user, document } = context
  const { name } = document
  return {
    title: name || '',
    description: '',
    version: '1.0.0',
    contact: {
      name: user!.username || '',
      email: user!.email || '',
    },
  }
}

/**
 * @function getServers
 * @summary
 *
 * @param {Array<Paw.Request>} requests - an array of Paw Requests.
 * @param {Object<Paw.Context>} context - an instance of Paw Context object.
 *
 * @returns {Array<OpenAPIV3.ServerObject>}
 */
export function buildServerObject(
  requests: Paw.Request[],
  context: Paw.Context,
): OpenAPIV3.ServerObject[] {
  /**
   * @function mapServers
   *  - an array map callback function to map servers used in the requests.
   */
  function mapServers(item: Paw.Request): OpenAPIV3.ServerObject {
    const paramCoverter = new ParametersConverter(item)
    const parameters = paramCoverter.getParameters()
    const requestURL = new PawURL(item, context, parameters)

    const getBasePath = new RegExp(/(\/api\/v\d+)/, 'g')
    const getBaseURL = new URL(requestURL.fullUrl)

    let baseURL = new URL(getBaseURL.origin)
    let basePathStr = ''
    let variables = null

    if (getBasePath.test(getBaseURL.pathname)) {
      const hasBasePath = getBaseURL.pathname.match(getBasePath) || []
      if (hasBasePath.length > 0) {
        basePathStr = '{basePath}'
        variables = {
          ['basePath']: {
            default: hasBasePath[0] || '',
          },
        }
      }
    }
    return {
      url: baseURL.href + basePathStr,
      description: '',
      variables: variables || undefined,
    }
  }

  /**
   * @function filterDuplicates
   *  - an array filter callback function to remove recurring server objects.
   */
  function filterDuplicates(
    item: OpenAPIV3.ServerObject,
    index: number,
    arr: OpenAPIV3.ServerObject[],
  ) {
    return (
      index ===
      arr.findIndex(
        (currentObject) =>
          JSON.stringify(currentObject) === JSON.stringify(item),
      )
    )
  }

  return [...requests]
    .map(mapServers)
    .filter(filterDuplicates) as OpenAPIV3.ServerObject[]
}

/**
 * @function buildRequestObject
 * @summary
 * @returns {Object<OpenAPIV3.RequestBodyObject>}
 */
export function buildRequestBodyObject(
  request: Paw.Request,
): OpenAPIV3.RequestBodyObject | undefined {
  let output: OpenAPIV3.RequestBodyObject = {
    description: request.description,
    content: {},
    required: ['post', 'put', 'patch'].includes(
      request.method.toString().toLowerCase(),
    ),
  }
  // extract content type, currently we have support to parse the schema for these
  // content types: application/x-www-form-urlencoded, application/json
  const getContentType = Object.keys(request.headers)
    .filter((header) => header.toLowerCase() === 'content-type')
    .map((header) => request.headers[header])
  const contentType =
    getContentType.length > 0 ? getContentType[0] : 'text/plain'

  if (request.jsonBody && contentType === 'application/json') {
    output.content[contentType as string] = {
      schema: extendToJsonSchema(
        toJsonSchema(request.jsonBody),
        request.jsonBody,
      ) as OpenAPIV3.SchemaObject,
    }

    return output as OpenAPIV3.RequestBodyObject
  }

  return undefined
}

/**
 * @function buildResponseObject
 * @summary
 * a function that builds a singline response object based on
 * httpexchange's response body content type.
 *
 * @param {String} contentType -
 * @param {Object|String} getResponseType -
 *
 * @returns {Object<OpenAPIV3.RequestBodyObject>}
 */
function buildResponseObject(
  media: string,
  content: any,
): OpenAPIV3.ResponseObject {
  // If the response is an array, build a schema from the first item in the collection.
  const responseSchema =
    Array.isArray(content) && content.length > 0
      ? toJsonSchema(content[0])
      : toJsonSchema(content)

  // utilize the built schema, extend it to comply with oas3 schema ref
  const schema =
    Array.isArray(content) && content.length > 0
      ? extendToJsonSchema(responseSchema, content[0])
      : extendToJsonSchema(responseSchema, content)
  return {
    description: '',
    content: {
      [media]: {
        schema: Array.isArray(content)
          ? { type: 'array', items: { ...schema } }
          : { ...schema },
      },
    },
  }
}

/**
 * @function buildResponseObject
 * @summary
 * @param {Object<Paw.Request>}  request - an instance of Paw request.
 * @returns {Object<OpenAPIV3.ResponsesObject>}
 */
export function buildResponsesObject(
  request: Paw.Request,
): OpenAPIV3.ResponsesObject {
  const getHttpExchange = request.getLastExchange()

  if (!getHttpExchange) {
    return { 200: { description: '' } }
  }

  const getContentType = Object.keys(getHttpExchange.responseHeaders)
    .filter((header) => header.toLowerCase() === 'content-type')
    .map((header) => getHttpExchange.responseHeaders[header])

  const getHeaders = Object.keys(getHttpExchange.responseHeaders)
    .map((header) => ({
      key: header,
      value: {
        description: '',
        schema: {
          type: typeof getHttpExchange.responseHeaders[header],
          example: getHttpExchange.responseHeaders[header],
        },
      },
    }))
    .reduce(
      (acc, curr) => ({ ...acc, [curr.key]: curr.value }),
      Object.create({}) as OpenAPIV3.HeaderObject,
    )

  const statusCode = getHttpExchange.responseStatusCode.toString()
  const contentType =
    getContentType.length > 0 ? getContentType[0] : 'text/plain'

  const responses: OpenAPIV3.ResponsesObject = {
    [statusCode]: {
      description: '',
    },
  }

  const getResponseType = jsonParseCheck(getHttpExchange.responseBody)
  const isJSON = new RegExp('(application/json)', 'g')
  const isURLEncoded = new RegExp('(application/x-www-form-urlencoded)', 'g')

  switch (true) {
    case isJSON.test(contentType) && typeof getResponseType === 'object':
    case isURLEncoded.test(contentType) && typeof getResponseType === 'object':
      responses[statusCode] = {
        ...buildResponseObject(contentType, getResponseType),
        headers: getHeaders as { [key: string]: OpenAPIV3.HeaderObject },
      }
      break
    default:
      responses[statusCode] = {
        description: '',
        content: {
          [contentType]: {
            example: {
              value: getResponseType,
            },
          },
        },
      }
      break
  }

  return responses
}

/**
 * @function buildParameterObject
 * @summary
 * @returns {Array<OpenAPIV3.ParameterObject>}
 */
export function buildParameterObject(): OpenAPIV3.ParameterObject[] {
  return []
}

/**
 * @function buildPathItemObject
 * @summary
 * - is a function where `pathItemObject` and `operationObject` are extracted from paw request.
 * - it maps request path and methods which are utilized  to build the operationObject.
 *
 * @param {Array<Paw.Request>} requests - an array of Paw Requests
 * @param {Object<Paw.Context>} context - an instance of Paw Context object
 *
 * @returns {Array<OpenAPIV3.ServerObject>}
 */
export function buildPathItemObject(
  request: Paw.Request[],
  context: Paw.Context,
): OpenAPIV3.PathItemObject {
  /**
   * @function mapRequestData
   *  - an array map callback that maps paw request data
   */
  function mapRequestData(item: Paw.Request): PawToOAS3 {
    const { method, description, id, name } = item

    const paramCoverter = new ParametersConverter(item)
    const parameters = paramCoverter.getParameters()
    const requestURL = new PawURL(item, context, parameters)

    const getRequestPath = requestURL.pathname
    const getPathPrefix = new RegExp(/(\/api\/v\d+)/, 'g')

    const requestBody = buildRequestBodyObject(item)
    const responses = buildResponsesObject(item)

    const output = {
      method: method as string,
      path: getPathPrefix.test(getRequestPath)
        ? getRequestPath.replace(getPathPrefix, '').replace(/\/$/, '')
        : getRequestPath,
      summary: name,
      description,
      operationId: id,
      parameters,
      requestBody,
      responses,
      security: [],
    }

    if (!requestBody) {
      delete output.requestBody
    }

    return output
  }

  /**
   * @function mapRequestMethods
   *  - an array reduce callback that groups requests with the same endpoints.
   *  - removes null, undefined or empty value keys
   */
  function mapRequestMethods(
    accumulator: any,
    requestItem: PawToOAS3,
  ): OpenAPIV3.PathItemObject {
    accumulator[requestItem.path] = accumulator[requestItem.path] || {}

    const key = (requestItem.method as string).toLowerCase()
    accumulator[requestItem.path][key] = {
      ...requestItem,
    } as OpenAPIV3.OperationObject

    delete accumulator[requestItem.path][key].path
    delete accumulator[requestItem.path][key].method
    return accumulator
  }

  return [...request]
    .map(mapRequestData)
    .reduce(mapRequestMethods, Object.create({}) as OpenAPIV3.PathItemObject)
}

export function buildSecurityScheme(
  request: Paw.Request,
): OpenAPIV3.SecuritySchemeObject {
  return {
    type: 'http',
    scheme: 'http',
  }
}

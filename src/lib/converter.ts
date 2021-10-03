import { OpenAPIV3 } from 'openapi-types'
import toJsonSchema from 'to-json-schema'
import qs from 'query-string'
import Paw from 'types/paw'
import { PawURL } from 'utils'

type PawToOAS3 = OpenAPIV3.OperationObject & {
  path: string
  method: string
}

const OAUTH2_DEFAULT_LABEL = 'oauth2_auth'

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

    if (!props) return { ...schema }

    Object.keys(props).forEach((i: string) => {
      if (props[i].type === 'null' || props[i].type === 'undefined') {
        props[i].nullable = true
        delete props[i].type
      }

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
  const isQueryString = new RegExp(
    /^\?([\w-]+(=[\w-]*)?(&[\w-]+(=[\w-]*)?)*)?$/,
    'g',
  )

  try {
    return JSON.parse(str)
  } catch (error) {
    if (/^(\?.*)/g.test(str) && isQueryString.test(str)) {
      return qs.parse(str)
    }

    if (isQueryString.test(`?${str}`)) {
      return qs.parse(str)
    }

    return str
  }
}

/**
 * @private
 * @function isVariableInString
 * @summary
 *
 * @param {Object<DynamicString>} dynamicString
 * @param variable
 * @returns
 */
function isVariableInString(
  dynamicString: DynamicString,
  variable: Paw.RequestVariable,
) {
  return !!dynamicString.components.find(
    (component: DynamicStringComponent) =>
      typeof component === 'object' &&
      component.type === 'com.luckymarmot.RequestVariableDynamicValue' &&
      component.variableUUID === variable.id,
  )
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
    const parameters = buildParameterObjectArray(item)
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

  return [...requests].map(mapServers).filter(filterDuplicates)
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

  const getContentType = Object.keys(request.headers)
    .filter((header) => header.toLowerCase() === 'content-type')
    .map((header) => (request.headers[header] as string).toLowerCase())

  const type = getContentType
    .map((header) => header.match(/((\w+)\/\'?\w+([-']\w+)*\'?)/g))
    .join()
    .toString()

  const body = request.getBody(true) as DynamicString
  switch (type) {
    case 'multipart/form-data':
      output.content[type as string] = body
        ? {
            schema: extendToJsonSchema(
              toJsonSchema(request.getMultipartBody()),
              request.getMultipartBody(),
            ) as OpenAPIV3.SchemaObject,
          }
        : {}
      break

    case 'application/x-www-form-urlencoded':
      output.content[type as string] = body
        ? {
            schema: extendToJsonSchema(
              toJsonSchema(body.getEvaluatedString()),
              body.getEvaluatedString(),
            ) as OpenAPIV3.SchemaObject,
          }
        : {}
      break

    case 'application/json':
      output.content[type as string] = body
        ? {
            schema: extendToJsonSchema(
              toJsonSchema(JSON.parse(body.getEvaluatedString())),
              JSON.parse(body.getEvaluatedString()),
            ) as OpenAPIV3.SchemaObject,
          }
        : {}
      break

    case 'application/octet-stream':
      const content = body.getOnlyDynamicValue() as DynamicValue
      output.content[type as string] =
        content.type === 'com.luckymarmot.FileContentDynamicValue'
          ? {
              schema: {
                type: 'string',
                format: 'base64',
                example: content.bookmarkData ? content.bookmarkData : '',
              },
            }
          : {}
      break

    case 'text/plain':
      output.content['text/plain'] = body
        ? {
            schema: {
              type: 'string',
              example: request.getBody() || '',
            },
          }
        : {}
      break
  }

  return output
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

  const statusCode =
    getHttpExchange.responseStatusCode === 0
      ? 200
      : getHttpExchange.responseStatusCode

  const contentType =
    getContentType.length > 0
      ? getContentType[0].replace(/(; .*)$/g, '')
      : 'text/plain'

  const responses: OpenAPIV3.ResponsesObject = {
    [statusCode]: { description: '' },
  }

  const getResponseType = jsonParseCheck(getHttpExchange.responseBody)
  const isJSON = new RegExp('(application/json)', 'g')
  const isURLEncoded = new RegExp('(application/x-www-form-urlencoded)', 'g')

  switch (true) {
    case isJSON.test(contentType) && typeof getResponseType === 'object':
    case isURLEncoded.test(contentType) && typeof getResponseType === 'object':
      responses[statusCode] = {
        ...buildResponseObject(contentType, getResponseType),
        headers: getHeaders as Record<string, OpenAPIV3.HeaderObject>,
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
 * @function buildParameterObjectArray
 * @summary
 * @returns {Array<OpenAPIV3.ParameterObject>}
 */
export function buildParameterObjectArray(
  request: Paw.Request,
): OpenAPIV3.ParameterObject[] {
  type RequestParameter = { [key: string]: string | DynamicString }

  /**
   * @function fromHeaderParams
   * a helper function that converts Paw.Request headers to
   * an openapi parameter object.
   *
   * @todo - find a way to access request variable type to avoid using conditional checks.
   */
  function fromHeaderParams(
    headers: RequestParameter,
  ): OpenAPIV3.ParameterObject[] {
    if (Object.keys(headers).length === 0) return []
    return Object.keys(headers).map((name) => {
      const getType = toJsonSchema(headers[name])
      return {
        name,
        in: 'header',
        schema: {
          type: getType && getType.type !== 'null' ? getType.type : 'string',
          default: headers[name].toString() || '',
          description: '',
        },
      }
    }) as OpenAPIV3.ParameterObject[]
  }

  /**
   * @function fromPathParams
   * a helper function that converts Paw.Request path variables to
   * an openapi parameter object.
   *
   * @todo - find a way to access request variable type to avoid using conditional checks.
   */
  function fromPathParams(req: Paw.Request): OpenAPIV3.ParameterObject[] {
    const variables = req.getVariablesNames() || []
    if (variables.length === 0) return []

    const createObject = variables
      .map((name: string) => {
        const variable = req.getVariableByName(name) as Paw.RequestVariable
        const isTruthy = isVariableInString(
          req.getUrlBase(true) as DynamicString,
          variable,
        )

        if (!isTruthy) return null

        const currentValue = variable.getCurrentValue()
        const getType = toJsonSchema(currentValue)
        return {
          name,
          in: 'path',
          required: variable.required,
          schema: {
            type: getType && getType.type !== 'null' ? getType.type : 'string',
            default: currentValue || '',
            description: variable.description || '',
          },
        }
      })
      .filter((item) => item !== null)
    return createObject as OpenAPIV3.ParameterObject[]
  }

  /**
   * @function fromQueryParams
   * a helper function that converts Paw.Request query params to
   * an openapi parameter object.
   *
   * @todo - find a way to access request variable type to avoid using conditional checks.
   */
  function fromQueryParams(queryString: string): OpenAPIV3.ParameterObject[] {
    if (queryString.trim() === '') return []
    const createQsObject = qs.parse(queryString)
    return Object.keys(createQsObject).map((name) => {
      const getType = toJsonSchema(createQsObject[name])
      return {
        name,
        in: 'query',
        schema: {
          type: getType && getType.type !== 'null' ? getType.type : 'string',
          default: createQsObject[name]?.toString() || '',
          description: '',
        },
      }
    }) as OpenAPIV3.ParameterObject[]
  }

  return ([] as OpenAPIV3.ParameterObject[]).concat(
    fromQueryParams(request.urlQuery),
    fromHeaderParams(request.headers),
    fromPathParams(request),
  )
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

    const parameters = buildParameterObjectArray(item)
    const requestURL = new PawURL(item, context, parameters)

    const getRequestPath = requestURL.pathname
    const getPathPrefix = new RegExp(/(\/api\/v\d+)/, 'g')

    const requestBody = buildRequestBodyObject(item)
    const responses = buildResponsesObject(item)
    const security: OpenAPIV3.SecurityRequirementObject[] = []

    /**
     * @todo:
     * - oauth2: placing this security requirement here for now because it's the only
     *   security type that is identifiable in Paw.Request instance.
     *
     * - `apiKey` and `openIdConnect` types doesn't seem to be supported in `Paw.Request`
     *   which doesn't allow the extension to evaluate a request's security scheme.
     *
     * - `http` type is evaluated from the request parameters.
     */
    if (item.oauth2) {
      const getOauth2Scopes =
        (item.oauth2.scope as string).replace(/\'/gi, '').split(',') || []
      security.push({ [OAUTH2_DEFAULT_LABEL]: [...getOauth2Scopes] })
    }

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
      security,
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

/**
 * @function buildSecuritySchemeAndRequirementsObject
 * @summary
 * @returns {Object<OpenAPIv3.SecurityDefinitionsObject>}
 */
export function buildSecurityShemeObject(requests: Paw.Request[]): any {
  type SecuritySchemeMapping = {
    label: string
    value: OpenAPIV3.SecuritySchemeObject | null
  }

  /**
   * @function getOauth2Schema
   * a helper function that extracts oauth2 `SecurityDefinitionsObject` from Paw.Request.
   * @todo:
   * - shouldn't we be able to set different types of oauth flows?
   *   see `OpenAPIV3.SecurityDefinitionsObject`, Paw.Request doesn't change/update
   *   `grant_type` value.
   */
  function getOauth2Schema(auth: OAuth2) {
    const scopes = (auth.scope as string).replace(/\'/gi, '').split(',') || []
    const oauth2Object = {
      type: 'oauth2',
      flows: {
        implicit: {
          authorizationUrl: auth.authorization_uri,
          scopes: scopes.reduce(
            (acc, curr) => ({
              ...acc,
              [curr]: 'scope description',
            }),
            {},
          ),
        },
      },
    }

    return {
      label: OAUTH2_DEFAULT_LABEL,
      value: oauth2Object as OpenAPIV3.SecuritySchemeObject,
    }
  }

  /**
   * @function mapRequestSecurityData
   * an array callback that builds security scheme object based off paw request object.
   */
  function mapRequestSecurityData(
    request: Paw.Request,
  ): SecuritySchemeMapping | null {
    let builtSchema = null

    if (request.oauth2) {
      builtSchema = getOauth2Schema(request.oauth2)
    }

    return builtSchema
  }

  /**
   * @function filterDuplicates
   * an array callback that removes null objects from an array
   */
  function filterDuplicates(
    item: SecuritySchemeMapping,
    index: number,
    array: SecuritySchemeMapping[],
  ): boolean {
    return array.findIndex((i) => i.label === item.label) === index
  }

  /**
   * @function mapSecuritySchema
   * - an array reduce callback to produce a proper SecuritySchemeObject
   */
  function mapSecuritySchema(acc: any, curr: any) {
    return { ...acc, [curr.label]: { ...curr.value } }
  }

  return [...requests]
    .map(mapRequestSecurityData)
    .filter((item: SecuritySchemeMapping) => item !== null)
    .filter(filterDuplicates)
    .reduce(
      mapSecuritySchema,
      {} as { [key: string]: OpenAPIV3.SecuritySchemeObject },
    )
}

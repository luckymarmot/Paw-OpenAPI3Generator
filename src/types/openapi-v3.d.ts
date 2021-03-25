declare namespace OpenAPIV3 {
  interface Document<T extends {} = {}> {
    openapi: string
    info: InfoObject
    servers?: ServerObject[]
    paths: PathsObject<T>
    components?: ComponentsObject
    security?: SecurityRequirementObject[]
    tags?: TagObject[]
    externalDocs?: ExternalDocumentationObject
    'x-express-openapi-additional-middleware'?: (
      | ((request: any, response: any, next: any) => Promise<void>)
      | ((request: any, response: any, next: any) => void)
    )[]
    'x-express-openapi-validation-strict'?: boolean
  }

  interface InfoObject {
    title: string
    description?: string
    termsOfService?: string
    contact?: ContactObject
    license?: LicenseObject
    version: string
  }

  interface ContactObject {
    name?: string
    url?: string
    email?: string
  }

  interface LicenseObject {
    name: string
    url?: string
  }

  interface ServerObject {
    url: string
    description?: string
    variables?: { [variable: string]: ServerVariableObject }
  }

  interface ServerVariableObject {
    enum?: string[]
    default: string
    description?: string
  }

  interface PathsObject<T extends {} = {}> {
    [pattern: string]: PathItemObject<T> | undefined
  }

  interface PathItemObject<T extends {} = {}> {
    $ref?: string
    summary?: string
    description?: string
    get?: OperationObject<T>
    put?: OperationObject<T>
    post?: OperationObject<T>
    delete?: OperationObject<T>
    options?: OperationObject<T>
    head?: OperationObject<T>
    patch?: OperationObject<T>
    trace?: OperationObject<T>
    servers?: ServerObject[]
    parameters?: (ReferenceObject | ParameterObject)[]
  }

  type OperationObject<T extends {} = {}> = {
    tags?: string[]
    summary?: string
    description?: string
    externalDocs?: ExternalDocumentationObject
    operationId?: string
    parameters?: (ReferenceObject | ParameterObject)[]
    requestBody?: ReferenceObject | RequestBodyObject
    responses?: ResponsesObject
    callbacks?: { [callback: string]: ReferenceObject | CallbackObject }
    deprecated?: boolean
    security?: SecurityRequirementObject[]
    servers?: ServerObject[]
  } & T

  interface ExternalDocumentationObject {
    description?: string
    url: string
  }

  interface ParameterObject extends ParameterBaseObject {
    name: string
    in: string
  }

  interface HeaderObject extends ParameterBaseObject {}

  interface ParameterBaseObject {
    description?: string
    required?: boolean
    deprecated?: boolean
    allowEmptyValue?: boolean
    style?: string
    explode?: boolean
    allowReserved?: boolean
    schema?: ReferenceObject | SchemaObject
    example?: any
    examples?: { [media: string]: ReferenceObject | ExampleObject }
    content?: { [media: string]: MediaTypeObject }
  }
  type NonArraySchemaObjectType =
    | 'boolean'
    | 'object'
    | 'number'
    | 'string'
    | 'integer'
  type ArraySchemaObjectType = 'array'
  type SchemaObject = ArraySchemaObject | NonArraySchemaObject

  interface ArraySchemaObject extends BaseSchemaObject {
    type: ArraySchemaObjectType
    items: ReferenceObject | SchemaObject
  }

  interface NonArraySchemaObject extends BaseSchemaObject {
    type?: NonArraySchemaObjectType
  }

  interface BaseSchemaObject {
    // JSON schema allowed properties, adjusted for OpenAPI
    title?: string
    description?: string
    format?: string
    default?: any
    multipleOf?: number
    maximum?: number
    exclusiveMaximum?: boolean
    minimum?: number
    exclusiveMinimum?: boolean
    maxLength?: number
    minLength?: number
    pattern?: string
    additionalProperties?: boolean | ReferenceObject | SchemaObject
    maxItems?: number
    minItems?: number
    uniqueItems?: boolean
    maxProperties?: number
    minProperties?: number
    required?: string[]
    enum?: any[]
    properties?: {
      [name: string]: ReferenceObject | SchemaObject
    }
    allOf?: (ReferenceObject | SchemaObject)[]
    oneOf?: (ReferenceObject | SchemaObject)[]
    anyOf?: (ReferenceObject | SchemaObject)[]
    not?: ReferenceObject | SchemaObject

    // OpenAPI-specific properties
    nullable?: boolean
    discriminator?: DiscriminatorObject
    readOnly?: boolean
    writeOnly?: boolean
    xml?: XMLObject
    externalDocs?: ExternalDocumentationObject
    example?: any
    deprecated?: boolean
  }

  interface DiscriminatorObject {
    propertyName: string
    mapping?: { [value: string]: string }
  }

  interface XMLObject {
    name?: string
    namespace?: string
    prefix?: string
    attribute?: boolean
    wrapped?: boolean
  }

  interface ReferenceObject {
    $ref: string
  }

  interface ExampleObject {
    summary?: string
    description?: string
    value?: any
    externalValue?: string
  }

  interface MediaTypeObject {
    schema?: ReferenceObject | SchemaObject
    example?: any
    examples?: { [media: string]: ReferenceObject | ExampleObject }
    encoding?: { [media: string]: EncodingObject }
  }

  interface EncodingObject {
    contentType?: string
    headers?: { [header: string]: ReferenceObject | HeaderObject }
    style?: string
    explode?: boolean
    allowReserved?: boolean
  }

  interface RequestBodyObject {
    description?: string
    content: { [media: string]: MediaTypeObject }
    required?: boolean
  }

  interface ResponsesObject {
    [code: string]: ReferenceObject | ResponseObject
  }

  interface ResponseObject {
    description: string
    headers?: { [header: string]: ReferenceObject | HeaderObject }
    content?: { [media: string]: MediaTypeObject }
    links?: { [link: string]: ReferenceObject | LinkObject }
  }

  interface LinkObject {
    operationRef?: string
    operationId?: string
    parameters?: { [parameter: string]: any }
    requestBody?: any
    description?: string
    server?: ServerObject
  }

  interface CallbackObject {
    [url: string]: PathItemObject
  }

  interface SecurityRequirementObject {
    [name: string]: string[]
  }

  interface ComponentsObject {
    schemas?: { [key: string]: ReferenceObject | SchemaObject }
    responses?: { [key: string]: ReferenceObject | ResponseObject }
    parameters?: { [key: string]: ReferenceObject | ParameterObject }
    examples?: { [key: string]: ReferenceObject | ExampleObject }
    requestBodies?: { [key: string]: ReferenceObject | RequestBodyObject }
    headers?: { [key: string]: ReferenceObject | HeaderObject }
    securitySchemes?: { [key: string]: ReferenceObject | SecuritySchemeObject }
    links?: { [key: string]: ReferenceObject | LinkObject }
    callbacks?: { [key: string]: ReferenceObject | CallbackObject }
  }

  type SecuritySchemeObject =
    | HttpSecurityScheme
    | ApiKeySecurityScheme
    | OAuth2SecurityScheme
    | OpenIdSecurityScheme

  interface HttpSecurityScheme {
    type: 'http'
    description?: string
    scheme: string
    bearerFormat?: string
  }

  interface ApiKeySecurityScheme {
    type: 'apiKey'
    description?: string
    name: string
    in: string
  }

  interface OAuth2SecurityScheme {
    type: 'oauth2'
    flows: {
      implicit?: {
        authorizationUrl: string
        refreshUrl?: string
        scopes: { [scope: string]: string }
      }
      password?: {
        tokenUrl: string
        refreshUrl?: string
        scopes: { [scope: string]: string }
      }
      clientCredentials?: {
        tokenUrl: string
        refreshUrl?: string
        scopes: { [scope: string]: string }
      }
      authorizationCode?: {
        authorizationUrl: string
        tokenUrl: string
        refreshUrl?: string
        scopes: { [scope: string]: string }
      }
    }
  }

  interface OpenIdSecurityScheme {
    type: 'openIdConnect'
    description?: string
    openIdConnectUrl: string
  }

  interface TagObject {
    name: string
    description?: string
    externalDocs?: ExternalDocumentationObject
  }
}

export default OpenAPIV3

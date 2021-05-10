import Paw from 'types/paw'

const ENVIRONMENT_DYNAMIC_VALUE =
  'com.luckymarmot.EnvironmentVariableDynamicValue'
const REQUEST_DYNAMIC_VALUE = 'com.luckymarmot.RequestVariableDynamicValue'
const FILE_DYNAMIC_VALUE = 'com.luckymarmot.FileContentDynamicValue'

/**
 * @exports createDynamicValue
 * @summary
 *  - renamed from `makeDv`
 *
 * @param {Object<createDynamicValueParams>} opts -
 * @returns {DynamicValue} class instance
 */
export const createDynamicValue = (
  type: string,
  props?: { [key: string]: any },
): DynamicValue => new DynamicValue(type, props)

/**
 * @exports createDynamicString
 * @summary
 *  - renamed from `makeDs`
 *
 * @param {Array<DynamicStringComponent>} prop
 * @returns {DynamicString} class instance
 */
export const createDynamicString = (
  ...prop: DynamicStringComponent[]
): DynamicString => new DynamicString(...prop)
/**
 * @exports createEnvironmentValues
 * @summary
 *  - renamed from `makeEnvDv`
 *
 * @param {String} variableUUID -
 * @returns {DynamicValue} class instance
 */
export const createEnvDynamicValue = (
  environmentVariable: string,
): DynamicValue =>
  createDynamicValue(ENVIRONMENT_DYNAMIC_VALUE, {
    environmentVariable,
  })

/**
 * @exports createRequestValues
 * @summary
 *  - renamed from `makeRequestDv`
 *
 * @param {String} variableUUID -
 * @returns {DynamicValue} class instance
 */
export const createRequestValues = (variableId: string) =>
  createDynamicValue(REQUEST_DYNAMIC_VALUE, { variableId })

/**
 * @exports createFileValues
 * @summary
 *
 * @returns {DynamicValue} class instance
 */
export const createFileValues = (): DynamicValue =>
  createDynamicValue(FILE_DYNAMIC_VALUE, { bookmarkData: null })

/**
 * @exports transformString
 * @summary
 *
 * @param {Object<TransformStringType>} opts
 * @param {String} opts.defaultValue
 * @param {EnvironmentManager} opts.envManager
 * @param {String} opts.stringInput
 * @param {Object<Paw.Request>} opts.requestInput
 *
 * @returns {DynamicValue} class instance
 */
export function convertEnvString(
  dynamicString: DynamicString,
  context: Paw.Context,
): string {
  if (!dynamicString) return ''
  return dynamicString.components
    .map((component): string => {
      if (typeof component === 'string') {
        return component
      }
      if (component.type === ENVIRONMENT_DYNAMIC_VALUE) {
        const envVarId = (component as any).environmentVariable
        const envVar = context.getEnvironmentVariableById(envVarId)
        if (envVar) {
          return `{${envVar.name}}`
        }
      }
      return component.getEvaluatedString()
    })
    .join('')
}

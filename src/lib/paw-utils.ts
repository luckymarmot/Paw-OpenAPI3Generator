// eslint-disable-next-line import/extensions
import Paw from 'types/paw'

const makeDv = (
  type: string,
  properties?: { [key: string]: any },
): DynamicValue => new DynamicValue(type, properties)

const makeDs = (...components: Paw.DynamicStringComponent[]): DynamicString =>
  new DynamicString(...components)

const makeEnvDv = (variableId: string): DynamicValue =>
  makeDv('com.luckymarmot.EnvironmentVariableDynamicValue', {
    environmentVariable: variableId,
  })

const makeRequestDv = (variableId: string): DynamicValue =>
  makeDv('com.luckymarmot.RequestVariableDynamicValue', {
    variableUUID: variableId,
  })

const makeFileDv = (): DynamicValue =>
  makeDv('com.luckymarmot.FileContentDynamicValue', {
    bookmarkData: null,
  })

const convertEnvString = (
  dynamicString: DynamicString,
  context: Paw.Context,
): string => {
  if (!dynamicString) {
    return ''
  }
  return dynamicString.components
    .map((component): string => {
      if (typeof component === 'string') {
        return component
      }
      if (
        component.type === 'com.luckymarmot.EnvironmentVariableDynamicValue'
      ) {
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

export {
  makeDv,
  makeDs,
  makeEnvDv,
  makeRequestDv,
  makeFileDv,
  convertEnvString,
}

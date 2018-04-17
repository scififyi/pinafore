import { getVerifyCredentials } from '../_api/user'
import { store } from '../_store/store'
import { switchToTheme } from '../_utils/themeEngine'
import { toast } from '../_utils/toast'
import { goto } from 'sapper/runtime.js'
import { cacheFirstUpdateAfter } from '../_utils/sync'
import { getInstanceInfo } from '../_api/instance'
import { clearDatabaseForInstance } from '../_database/clear'
import {
  getInstanceVerifyCredentials as getInstanceVerifyCredentialsFromDatabase,
  setInstanceVerifyCredentials as setInstanceVerifyCredentialsInDatabase,
  getInstanceInfo as getInstanceInfoFromDatabase,
  setInstanceInfo as setInstanceInfoInDatabase
} from '../_database/meta'

export function changeTheme (instanceName, newTheme) {
  let instanceThemes = store.get('instanceThemes')
  instanceThemes[instanceName] = newTheme
  store.set({instanceThemes: instanceThemes})
  store.save()
  if (instanceName === store.get('currentInstance')) {
    switchToTheme(newTheme)
  }
}

export function switchToInstance (instanceName) {
  let instanceThemes = store.get('instanceThemes')
  store.set({
    currentInstance: instanceName,
    searchResults: null,
    queryInSearch: ''
  })
  store.save()
  switchToTheme(instanceThemes[instanceName])
}

export async function logOutOfInstance (instanceName) {
  let loggedInInstances = store.get('loggedInInstances')
  let instanceThemes = store.get('instanceThemes')
  let loggedInInstancesInOrder = store.get('loggedInInstancesInOrder')
  let composeData = store.get('composeData')
  let currentInstance = store.get('currentInstance')
  loggedInInstancesInOrder.splice(loggedInInstancesInOrder.indexOf(instanceName), 1)
  let newInstance = instanceName === currentInstance
    ? loggedInInstancesInOrder[0]
    : currentInstance
  delete loggedInInstances[instanceName]
  delete instanceThemes[instanceName]
  delete composeData[instanceName]
  store.set({
    loggedInInstances: loggedInInstances,
    instanceThemes: instanceThemes,
    loggedInInstancesInOrder: loggedInInstancesInOrder,
    currentInstance: newInstance,
    searchResults: null,
    queryInSearch: '',
    composeData: composeData
  })
  store.save()
  toast.say(`Logged out of ${instanceName}`)
  switchToTheme(instanceThemes[newInstance] || 'default')
  await clearDatabaseForInstance(instanceName)
  goto('/settings/instances')
}

function setStoreVerifyCredentials (instanceName, thisVerifyCredentials) {
  let verifyCredentials = store.get('verifyCredentials')
  verifyCredentials[instanceName] = thisVerifyCredentials
  store.set({verifyCredentials: verifyCredentials})
}

export async function updateVerifyCredentialsForInstance (instanceName) {
  let loggedInInstances = store.get('loggedInInstances')
  let accessToken = loggedInInstances[instanceName].access_token
  await cacheFirstUpdateAfter(
    () => getVerifyCredentials(instanceName, accessToken),
    () => getInstanceVerifyCredentialsFromDatabase(instanceName),
    verifyCredentials => setInstanceVerifyCredentialsInDatabase(instanceName, verifyCredentials),
    verifyCredentials => setStoreVerifyCredentials(instanceName, verifyCredentials)
  )
}

export async function updateVerifyCredentialsForCurrentInstance () {
  await updateVerifyCredentialsForInstance(store.get('currentInstance'))
}

export async function updateInstanceInfo (instanceName) {
  await cacheFirstUpdateAfter(
    () => getInstanceInfo(instanceName),
    () => getInstanceInfoFromDatabase(instanceName),
    info => setInstanceInfoInDatabase(instanceName, info),
    info => {
      let instanceInfos = store.get('instanceInfos')
      instanceInfos[instanceName] = info
      store.set({instanceInfos: instanceInfos})
    }
  )
}

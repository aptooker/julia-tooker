targetScope = 'resourceGroup'

@description('Globally unique Static Web App name.')
param staticWebAppName string = 'julia-tooker-site-2d1a71'

@description('Globally unique Function App name.')
param functionAppName string = 'julia-tooker-signup-api-2d1a71'

@description('Globally unique storage account name, 3-24 lowercase letters and numbers.')
param storageAccountName string = 'jptookersignups2d1a71'

@description('Region for the Function App. East US is used because East US 2 has no Y1 quota.')
param functionLocation string = 'eastus'

var location = resourceGroup().location
var tableName = 'eventSignups'

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
  tags: {
    'app-onboard-skill': 'true'
  }
}

resource staticWebAppSettings 'Microsoft.Web/staticSites/config@2022-09-01' = {
  name: 'appsettings'
  parent: staticWebApp
  properties: {
    SIGNUPS_TABLE_NAME: tableName
    STORAGE_ACCOUNT_NAME: storage.name
    STORAGE_ACCOUNT_KEY: storage.listKeys().keys[0].value
    AzureWebJobsStorage: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
  }
  dependsOn: [storage]
}

resource functionPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${functionAppName}-plan'
  location: functionLocation
  kind: 'functionapp'
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: true
  }
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: functionLocation
  kind: 'functionapp,linux'
  properties: {
    serverFarmId: functionPlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'Node|18'
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~18'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'SIGNUPS_TABLE_NAME'
          value: tableName
        }
        {
          name: 'STORAGE_ACCOUNT_NAME'
          value: storage.name
        }
        {
          name: 'STORAGE_ACCOUNT_KEY'
          value: storage.listKeys().keys[0].value
        }
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
        }
      ]
      cors: {
        allowedOrigins: [
          'https://${staticWebApp.properties.defaultHostname}'
        ]
      }
    }
  }
  dependsOn: [storage]
}

output staticWebAppHostname string = staticWebApp.properties.defaultHostname
output signupEndpoint string = 'https://${staticWebApp.properties.defaultHostname}/api/signup'
output functionAppHostname string = functionApp.properties.defaultHostName

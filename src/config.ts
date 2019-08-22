const envParser = require('rainu-env-parser')

//DO NOT USE CAMEL_CASE! IT WILL TRANSFORMED TO lowercase!
const defaults = {
  log: {
    level: 'info'
  },
  mqtt: {
    broker: "localhost:1883",
    client: {
      id: "text-mapper"
    },
    topic: {
      in: "lookup/+",
      out: "decide/__CLIENT_ID__"
    }
  },
  client: {
    user: {
      base: 'http://user-service:80'
    },
  },
  mapper: {
    confidence: {
      min: 80
    }
  }
}

const parseEnv = function() {
  let config =  envParser.parse("CFG_", defaults)

  return config
}

export = {
  ...parseEnv(),
  parseEnv,
}
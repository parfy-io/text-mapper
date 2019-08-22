import cfg = require('./config')
import log = require('./log')
import mqtt = require('./channel/mqtt')
import ur = require("./userResolver");

let userResolver = ur.newUserResolver(cfg.client.user.base, cfg.mapper.confidence.min)
let mqttClient = mqtt.newMQTTClient(cfg.mqtt.broker, cfg.mqtt.topic.in)
mqttClient.Start({
  HandleLookupRequest: (correlationId, clientId, text) => {
    log.info("Incoming lookup", {correlationId, clientId, text})
    userResolver.ResolveUserId(clientId, correlationId, text)
      .then(userId => {
        if(!userId) {
          log.warn("No user found!", {correlationId, clientId})
          return
        }
        mqttClient.SendRecognition(userId, cfg.mqtt.topic.out.replace("__CLIENT_ID__", clientId), correlationId)
      }).catch(err => {
        log.error("Error while resolving user id!", {error: err, correlationId, clientId})
      })
  },
  HandleError: () => process.exit(2)
})
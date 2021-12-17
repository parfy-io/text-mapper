import cfg = require('./config')
import log = require('./log')
import mqtt = require('./channel/mqtt')
import ur = require("./userResolver");

let userResolver = ur.newUserResolver(cfg.client.user.base, cfg.client.user.apikey, cfg.mapper.confidence.min)
let mqttClient = mqtt.newMQTTClient(cfg.mqtt.broker, cfg.mqtt.topic.in, cfg.mqtt.username, cfg.mqtt.password)
mqttClient.Start({
  HandleLookupRequest: (correlationId, clientId, text) => {
    log.info("Incoming lookup", {correlationId, clientId, text})
    mqttClient.SendInfoStatus(202, 'Start text mapping.', cfg.buildTopic(cfg.mqtt.topic.status, clientId, correlationId))

    userResolver.ResolveUserId(clientId, correlationId, text)
      .then(userId => {
        if(!userId) {
          log.warn("No user found!", {correlationId, clientId})
          mqttClient.SendErrorStatus(404, 'No user could be found.', cfg.buildTopic(cfg.mqtt.topic.status, clientId, correlationId))
          return
        }
        mqttClient.SendRecognition(userId, cfg.buildTopic(cfg.mqtt.topic.out, clientId, correlationId))
        mqttClient.SendInfoStatus(200, 'User was found.', cfg.buildTopic(cfg.mqtt.topic.status, clientId, correlationId))
      }).catch(err => {
        log.error("Error while resolving user id!", {error: err, correlationId, clientId})
        mqttClient.SendErrorStatus(500, 'Error while resolving user id!', cfg.buildTopic(cfg.mqtt.topic.status, clientId, correlationId))
      })
  },
  HandleError: () => process.exit(2)
})
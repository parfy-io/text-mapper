import mqtt = require('mqtt')
import log = require('../log')

//exposed for mocking purposes
export let $mqttConnect = mqtt.connect

export interface Callback {
  HandleLookupRequest(correlationId: string, clientId : string, text: Array<string>)
  HandleError(error : any)
}

export const newMQTTClient = (broker : string, topic : string) => {
  return {
    $client: $mqttConnect(`mqtt://${broker}`),

    Start(callback : Callback) {
      this.$client.on('connect', () => {
        log.info('Connection to mqtt broker established.')

        this.$client.subscribe(topic, {qos: 1}, (err) => {
          if(err) {
            log.error('Failed to connect to mqtt broker!', {error: err})
            callback.HandleError(err)
          }
        })
      })

      this.$client.on('message', (topic, message) => {
        const topicParts = topic.split('/')
        const clientId = topicParts[topicParts.length - 1]

        try{
          const parsedMessage = JSON.parse(message.toString())
          if(!parsedMessage.correlationID) {
            log.warn('Received a invalid message', {clientId, error: "no correlationId"})
            return
          }
          if(!parsedMessage.lookup) {
            log.warn('Received a invalid message', {clientId, error: "no lookup"})
            return
          }

          callback.HandleLookupRequest(parsedMessage.correlationID, clientId, parsedMessage.lookup)
        }catch (e) {
          log.warn('Received a invalid message', {clientId, error: e})
          return
        }
      })
    },

    SendRecognition(userId : string, topic : string, correlationId : string) {
      this.$client.publish(topic, JSON.stringify({
        correlationID: correlationId,
        userID: userId,
      }), {qos: 1})
    }
  }
}
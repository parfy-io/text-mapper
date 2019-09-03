import mqtt = require('mqtt')
import log = require('../log')

//exposed for mocking purposes
export let $mqttConnect = mqtt.connect

export interface Callback {
  HandleLookupRequest(correlationId: string, clientId : string, text: Array<string>)
  HandleError(error : any)
}

export const newMQTTClient = (broker : string, topic : string, username : string = "", password : string = "") => {
  let options = {}
  if(username){
    options = {
      username: username,
      password: password
    }
  }

  return {
    $client: $mqttConnect(`mqtt://${broker}`, options),

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
        if(topicParts.length < 3) {
          log.warn('Received a invalid message - invalid topic structure')
          return
        }
        const correlationId = topicParts[topicParts.length - 1]
        const clientId = topicParts[topicParts.length - 2]

        try{
          const parsedMessage = JSON.parse(message.toString())
          if(!parsedMessage.lookup) {
            log.warn('Received a invalid message', {clientId, correlationId, error: "no lookup"})
            return
          }

          callback.HandleLookupRequest(correlationId, clientId, parsedMessage.lookup)
        }catch (e) {
          log.warn('Received a invalid message', {clientId, correlationId, error: e})
          return
        }
      })
    },

    SendRecognition(userId : string, topic : string) {
      this.$client.publish(topic, JSON.stringify({
        userID: userId,
      }), {qos: 1})
    },

    SendInfoStatus(code : number, message : string, topic : string) {
      this.sendStatus('info', code, message, topic)
    },
    SendErrorStatus(code : number, message : string , topic : string) {
      this.sendStatus('error', code, message, topic)
    },

    sendStatus(level : string, code : number, message : string, topic : string) {
      this.$client.publish(topic, JSON.stringify({
        level: level,
        source: 'text-mapper',
        code: code,
        message: message,
        timestamp: new Date().toISOString()
      }), {qos: 1})
    }
  }
}
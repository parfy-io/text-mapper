const cfg = require("../src/config")
const assert = require('assert')

describe('Configuration mechanism', () => {

  describe('Default values', () => {

    let configs = [
      {l: "mqtt broker", k: (c) => c.mqtt.broker, v: "localhost:1883"},
      {l: "mqtt clientId", k: (c) => c.mqtt.client.id, v: "text-mapper"},
      {l: "mqtt topic", k: (c) => c.mqtt.topic.in, v: "lookup/+/+"},
      {l: "mqtt topic", k: (c) => c.mqtt.topic.out, v: "decide/__CLIENT_ID__/__CORRELATION_ID__"},
      {l: "mqtt topic", k: (c) => c.mqtt.topic.status, v: "status/__CLIENT_ID__/__CORRELATION_ID__"},
    ]

    for(let i in configs) {
      const curConfig = configs[i]
      it(`... for ${curConfig.l}`, () => {
        assert.strictEqual(curConfig.k(cfg), curConfig.v)
      })
    }
  })

  describe('Overwritten with environment variables', () => {

    let configs = [
      {e: "CFG_LOG_LEVEL", v: 'error', k: (c) => c.log.level},
      {e: "CFG_MQTT_BROKER", v: '<mqtt-broker>', k: (c) => c.mqtt.broker},
      {e: "CFG_MQTT_CLIENT_ID", v: '<mqtt-clientId>', k: (c) => c.mqtt.client.id},
      {e: "CFG_MQTT_TOPIC_IN", v: '<mqtt-topic>', k: (c) => c.mqtt.topic.in},
      {e: "CFG_MQTT_TOPIC_OUT", v: '<mqtt-topic>', k: (c) => c.mqtt.topic.out},
      {e: "CFG_MQTT_TOPIC_STATUS", v: '<mqtt-topic>', k: (c) => c.mqtt.topic.status},
      {e: "CFG_OTHERVALUE", v: 'someOtherValue', k: (c) => c.othervalue},
    ]

    for(let i in configs) {
      const curConfig = configs[i]
      it(`... for ${curConfig.e}`, () => {
        //given
        process.env[curConfig.e] = curConfig.v

        //when
        const newCfg = cfg.parseEnv()

        //then
        if(curConfig.e.endsWith('0')) {
          assert.deepStrictEqual(curConfig.k(newCfg), [curConfig.v])
        }else {
          assert.strictEqual(curConfig.k(newCfg), curConfig.v)
        }
      })
    }
  })
})

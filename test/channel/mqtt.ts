import assert = require('assert')
import mqtt = require('../../src/channel/mqtt')

describe('MQTT channel', () => {

  beforeEach(() => {
    // @ts-ignore
    mqtt.$mqttConnect = () => '<mqttClient>'
  });

  it('configure mqtt correctly', () => {
    //given
    const broker = '<broker>'
    const username = '<username>'
    const password = '<password>'
    const topic = '<topic>'

    // @ts-ignore
    mqtt.$mqttConnect = (brokerUrl, options) => {
      assert.strictEqual(brokerUrl, `mqtt://${broker}`)
      assert.deepStrictEqual(options, {
        username, password
      })
      return '<mqttClient>'
    }

    //when
    const toTest = mqtt.newMQTTClient(broker, topic, username, password)

    //then
    assert.strictEqual('<mqttClient>', toTest.$client)
  })

  it('configure mqtt correctly without user credentials', () => {
    //given
    const broker = '<broker>'
    const topic = '<topic>'

    // @ts-ignore
    mqtt.$mqttConnect = (brokerUrl, options) => {
      assert.strictEqual(brokerUrl, `mqtt://${broker}`)
      assert.deepStrictEqual(options, {})
      return '<mqttClient>'
    }

    //when
    const toTest = mqtt.newMQTTClient(broker, topic)

    //then
    assert.strictEqual('<mqttClient>', toTest.$client)
  })

  describe('Start', () => {

    it('assign the right events', (done) => {
      //given
      const toTest = mqtt.newMQTTClient("", "")
      toTest.$client = {
        firstCall: true,
        // @ts-ignore
        on(event, cb) {
          // @ts-ignore
          if(this.firstCall) {
            assert.strictEqual(event, "connect")
            assert(cb)
          }else{
            assert.strictEqual(event, "message")
            assert(cb)
          }

          // @ts-ignore
          this.firstCall = false
        }
      }
      //when
      toTest.Start({
        HandleLookupRequest(correlationId: string, clientId: string, text: Array<string>) {},
        HandleError(error: any) {}
      })

      done()
    })

    it('will subscribe the right topic after connection', (done) => {
      //given
      const testTopic = '<topic>'
      const toTest = mqtt.newMQTTClient("", testTopic)
      let subscribeCalled = false
      toTest.$client = {
        // @ts-ignore
        on(event, cb) {
          if(event === 'connect') cb() //call the callback
        },
        // @ts-ignore
        subscribe(topic, opts, cb){
          subscribeCalled = true

          assert.strictEqual(topic, testTopic)
          assert.strictEqual(opts.qos, 1)
          assert(cb)
        }
      }
      //when
      toTest.Start({
        HandleLookupRequest(correlationId: string, clientId: string, text: Array<string>) {},
        HandleError(error: any) {}
      })

      //then
      assert(subscribeCalled)

      done()
    })

    it('will call the callback on subscription error', (done) => {
      //given
      const toTest = mqtt.newMQTTClient("", "")
      toTest.$client = {
        // @ts-ignore
        on(event, cb) {
          if(event === 'connect') cb() //call the callback
        },
        // @ts-ignore
        subscribe(topic, opts, cb){
          // @ts-ignore
          cb('someError') //simulate error
        }
      }
      //when
      let cbCalled = false
      toTest.Start({
        HandleError(error: any) {
          cbCalled = true
          assert.strictEqual(error, 'someError')
        },
        HandleLookupRequest(correlationId: string, clientId: string, text: Array<string>) {}
      })

      //then
      assert(cbCalled)

      done()
    })

    it('will dont call the callback when no subscription error', (done) => {
      //given
      const toTest = mqtt.newMQTTClient("", "")
      toTest.$client = {
        // @ts-ignore
        on(event, cb) {
          if(event === 'connect') cb() //call the callback
        },
        // @ts-ignore
        subscribe(topic, opts, cb){
          // @ts-ignore
          cb() //simulate no error
        }
      }
      //when
      let cbCalled = false
      toTest.Start({
        HandleError(error: any) {
          cbCalled = true
        },
        HandleLookupRequest(correlationId: string, clientId: string, text: Array<string>) {}
      })

      //then
      assert(!cbCalled)

      done()
    })

    describe('will not call the callback on invalid messages', () => {

      let testCases = [
        {topic: '/map/<clientId>/<correlationId>', message: ''}, //right topic, empty message
        {topic: '/map/<clientId>/<correlationId>', message: JSON.stringify({})}, //right topic, missing lookup
        {topic: '', message: JSON.stringify({lookup: ['']})}, //wrong topic right message
      ]

      for(let i in testCases) {
        const curTestCase = testCases[i]
        it(`... case #${i}`, (done) => {
          //given
          const toTest = mqtt.newMQTTClient("", "")
          toTest.$client = {
            // @ts-ignore
            on(event, cb) {
              if(event === 'message'){
                cb(curTestCase.topic, Buffer.from(curTestCase.message)) //call the callback
              }
            }
          }
          //when
          let cbCalled = false
          toTest.Start({
            HandleLookupRequest() {
              cbCalled = true
            },
            HandleError(error: any) {}
          })

          //then
          assert(!cbCalled)

          done()
        })

      }
    })

    it('will call the callback on valid messages', (done) => {
      //given
      const testCorrelationId = "eafbd535-01df-403c-909e-aabec87c3c28"
      const testMessage = JSON.stringify({lookup: '<lookup>'})
      const testClientId = '<clientId>'
      const toTest = mqtt.newMQTTClient("", "")
      toTest.$client = {
        // @ts-ignore
        on(event, cb) {
          if(event === 'message'){
            //call the callback
            cb(`root/${testClientId}/${testCorrelationId}`, Buffer.from(testMessage))
          }
        }
      }
      //when
      let cbCalled = false
      toTest.Start({
        HandleLookupRequest(correlationId, clientId, text) {
          cbCalled = true
          assert.strictEqual(correlationId, testCorrelationId)
          assert.strictEqual(clientId, testClientId)
          assert.strictEqual(text, '<lookup>')
        },
        HandleError(error: any) {}
      })

      //then
      assert(cbCalled)

      done()
    })

  })

  describe('SendRecognition', () => {

    it('should publish the right message to the topic', (done) => {
      //given
      const testTopic = '<topic>'
      const testUserId = '<userId>'
      const toTest = mqtt.newMQTTClient("", "")
      toTest.$client = {
        // @ts-ignore
        publish(topic, message, options) {
          assert.strictEqual(topic, testTopic)
          assert.deepStrictEqual(JSON.parse(message), {
            userID: testUserId
          })
          assert.deepStrictEqual(options, { qos: 1 })
        }
      }

      //when
      toTest.SendRecognition(testUserId, testTopic)

      done()
    })

  })

  describe('SendInfoStatus', () => {

    it('should publish the right message to the topic', (done) => {
      //given
      const testTopic = '<topic>'
      const testMessage = '<message>'
      const testCode = 1312
      const toTest = mqtt.newMQTTClient("", "")
      toTest.$client = {
        // @ts-ignore
        publish(topic, message, options) {
          const parsed = JSON.parse(message)

          assert.strictEqual(topic, testTopic)
          assert.strictEqual(parsed.level, 'info')
          assert.strictEqual(parsed.source, 'text-mapper')
          assert.strictEqual(parsed.code, testCode)
          assert.strictEqual(parsed.message, testMessage)
          assert(parsed.timestamp)
          assert.deepStrictEqual(options, { qos: 1 })
        }
      }

      //when
      toTest.SendInfoStatus(testCode, testMessage, testTopic)

      done()
    })

  })

  describe('SendErrorStatus', () => {

    it('should publish the right message to the topic', (done) => {
      //given
      const testTopic = '<topic>'
      const testMessage = '<message>'
      const testCode = 1312
      const toTest = mqtt.newMQTTClient("", "")
      toTest.$client = {
        // @ts-ignore
        publish(topic, message, options) {
          const parsed = JSON.parse(message)

          assert.strictEqual(topic, testTopic)
          assert.strictEqual(parsed.level, 'error')
          assert.strictEqual(parsed.source, 'text-mapper')
          assert.strictEqual(parsed.code, testCode)
          assert.strictEqual(parsed.message, testMessage)
          assert(parsed.timestamp)
          assert.deepStrictEqual(options, { qos: 1 })
        }
      }

      //when
      toTest.SendErrorStatus(testCode, testMessage, testTopic)

      done()
    })

  })
})
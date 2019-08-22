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
    const topic = '<topic>'

    // @ts-ignore
    mqtt.$mqttConnect = (brokerUrl) => {
      assert.strictEqual(brokerUrl, `mqtt://${broker}`)
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

      let testMessages = [
          '',
          JSON.stringify({}), //missing correlationId
          JSON.stringify({correlationID: '<correlationId>'}), //missing lookup
      ]

      for(let i in testMessages) {
        const curTestMessage = testMessages[i]
        it(`... case #${i}`, (done) => {
          //given
          const toTest = mqtt.newMQTTClient("", "")
          toTest.$client = {
            // @ts-ignore
            on(event, cb) {
              if(event === 'message'){
                cb("", Buffer.from(curTestMessage)) //call the callback
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
      const testMessage = JSON.stringify({correlationID: testCorrelationId, lookup: '<lookup>'})
      const testClientId = '<clientId>'
      const toTest = mqtt.newMQTTClient("", "")
      toTest.$client = {
        // @ts-ignore
        on(event, cb) {
          if(event === 'message'){
            //call the callback
            cb(`root/${testClientId}`, Buffer.from(testMessage))
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
      const testCorrelationId = '<correlationId>'
      const toTest = mqtt.newMQTTClient("", "")
      toTest.$client = {
        // @ts-ignore
        publish(topic, message, options) {
          assert.strictEqual(topic, testTopic)
          assert.deepStrictEqual(JSON.parse(message), {
            correlationID:testCorrelationId,
            userID: testUserId
          })
          assert.deepStrictEqual(options, { qos: 1 })
        }
      }

      //when
      toTest.SendRecognition(testUserId, testTopic, testCorrelationId)

      done()
    })

  })
})
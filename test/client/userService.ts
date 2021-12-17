import assert = require('assert')
import userService = require('../../src/client/userService')

describe('UserService', () => {

  it('configure user-service correctly', () => {
    //given
    //when
    const toTest = userService.newUserService('<baseUrl>')

    //then
    assert(toTest.$client)
  })

  describe('GetUsers', () => {

    it('should provide the origin error', (done) => {
      //given
      const toTest = userService.newUserService('<baseUrl>', '<apikey>')
      toTest.$client = {
        post(url, data, config) {
          assert.strictEqual(url, `<baseUrl>`)
          assert.strictEqual(config.headers["X-Correlation-Id"], "<correlationId>")
          assert.strictEqual(config.headers["Authorization"], "Bearer <apikey>")
          assert.strictEqual(data.query, userService.gqlGetUsers)
          assert.deepStrictEqual(data.variables, {
            "clientName": "<clientId>",
            "offset": 1,
            "limit": 13
          })

          return Promise.reject('someError')
        }
      }

      //when
      let result = toTest.GetUsers('<clientId>', '<correlationId>', 1, 13)

      //then
      result.then(() => {
        assert.fail("It should be rejected!")
      }).catch((err) => {
        assert.strictEqual(err, "someError")
        done()
      })
    })

    it('should reject if the response seams to be wrong', (done) => {
      //given
      const toTest = userService.newUserService('<baseUrl>')
      toTest.$client = {
        post(url, data, config) {
          assert.strictEqual(url, `<baseUrl>`)
          assert.strictEqual(config.headers["X-Correlation-Id"], "<correlationId>")
          assert.strictEqual(config.headers["Authorization"], undefined)
          assert.strictEqual(data.query, userService.gqlGetUsers)
          assert.deepStrictEqual(data.variables, {
            "clientName": "<clientId>",
            "offset": 1,
            "limit": 13
          })

          return Promise.resolve({})
        }
      }

      //when
      let result = toTest.GetUsers('<clientId>', '<correlationId>', 1, 13)

      //then
      result.then(() => {
        assert.fail("It should be rejected!")
      }).catch((err) => {
        assert(err)
        done()
      })
    })

    it('should provide the response from user-service', async () => {
      //given
      const toTest = userService.newUserService('<baseUrl>')
      toTest.$client = {
        post(url, data, config) {
          assert.strictEqual(url, `<baseUrl>`)
          assert.strictEqual(config.headers["X-Correlation-Id"], "<correlationId>")
          assert.strictEqual(data.query, userService.gqlGetUsers)
          assert.deepStrictEqual(data.variables, {
            "clientName": "<clientId>",
            "offset": 1,
            "limit": 13
          })

          return Promise.resolve({
            data: {
              "data": {
                "employees": {
                  "data": [{
                    "id": "1",
                    "attributes": {
                      "names": [ "Rainu", "Raysha" ]
                    }
                  }]
                }
              }
            }
          })
        }
      }

      //when
      const result = await toTest.GetUsers('<clientId>', '<correlationId>', 1, 13)

      //then
      assert.deepEqual(result, [{
        id: "1", names: ["Rainu", "Raysha"]
      }])
    })

  })
})
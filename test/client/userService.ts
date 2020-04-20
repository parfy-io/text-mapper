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
      const toTest = userService.newUserService('<baseUrl>')
      toTest.$client = {
        get(url, config) {
          assert.strictEqual(url, `<baseUrl>/v1/clients/<clientId>/users`)
          assert.strictEqual(config.headers["X-Correlation-Id"], "<correlationId>")
          assert.deepStrictEqual(config.params, {
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
        get(url, config) {
          assert.strictEqual(url, `<baseUrl>/v1/clients/<clientId>/users`)
          assert.strictEqual(config.headers["X-Correlation-Id"], "<correlationId>")
          assert.deepStrictEqual(config.params, {
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

    it('should provide the response from user-service', (done) => {
      //given
      const toTest = userService.newUserService('<baseUrl>')
      toTest.$client = {
        get(url, config) {
          assert.strictEqual(url, `<baseUrl>/v1/clients/<clientId>/users`)
          assert.strictEqual(config.headers["X-Correlation-Id"], "<correlationId>")
          assert.deepStrictEqual(config.params, {
            "offset": 1,
            "limit": 13
          })

          return Promise.resolve({data: '<data>'})
        }
      }

      //when
      let result = toTest.GetUsers('<clientId>', '<correlationId>', 1, 13)

      //then
      result.then((resp) => {
        assert.strictEqual(resp, '<data>')
        done()
      }).catch((err) => {
        assert.fail("It should be rejected!")
        done()
      })
    })

  })
})
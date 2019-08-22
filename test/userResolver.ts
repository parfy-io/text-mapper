import userResolver = require("../src/userResolver")
import assert = require('assert')

describe('UserResolver', () => {

  describe('filterPotentialUsers', () => {

    let useCases = [
        { d: 'one exact match', text: ["Jon Mustermann", "R13", "DE 0012", "Jon Mustnann", "Jon Muttea(ean", "Teststr. 1-4", "O OOtnn", "Centaet", "Phone", "Note", "Notes", "Ret-Not", "DE"] },
        { d: 'one close enough match', text: ["R13", "DE 0012", "Jon Mustenann", "Jon Muttea(ean", "Teststr. 1-4", "O OOtnn", "Centaet", "Phone", "Note", "Notes", "Ret-Not", "DE"] },
    ]

    for(let curUseCase of useCases) {
      it(`should find the right user: ${curUseCase.d}`, () => {
        //given
        let testUsers = [
          { id: "1", names: ["Jon", "Mustermann"] },
          { id: "2", names: ["Jon", "Maiermann"] },
          { id: "3", names: ["Günter", "Müller"] },
        ]
        let toTest = userResolver.newUserResolver('<baseUrl>', 80)

        //when
        let result = toTest.filterPotentialUsers(testUsers, curUseCase.text)

        //then
        assert.strictEqual(result.length, 1)
        assert.strictEqual(result[0].id, "1")
      })
    }
  })

  describe('getPotentialUsers', () => {

    it('should process until last user', (done) => {
      //given
      let toTest = userResolver.newUserResolver('<baseUrl>')
      const testClientId = '<clientId>'
      const testCorrelationId = '<correlationId>'
      const testText = ['<text#1>', '<text#2>']
      toTest.filterPotentialUsers = (users, text) => {
        assert.deepStrictEqual(text, testText)
        return users.map(u => {return {...u, confidence: 0}})
      }
      toTest.$userServiceClient = {
        GetUsers(clientId, correlationId, offset, limit = 0){
          assert.strictEqual(clientId, testClientId)
          assert.strictEqual(correlationId, testCorrelationId)

          let users = []
          if(offset === 0) {
            //first page
            for(let i=0; i < limit; i ++){
              // @ts-ignore
              users.push({id: `${i}`, names: [`Name #${i}`]})
            }
          } else{
            //second (last) page
            for(let i=0; i < limit - 1; i ++){
              // @ts-ignore
              users.push({id: `${i}`, names: [`Name #${i}`]})
            }
          }

          return Promise.resolve(users)
        }
      }

      //when
      let result = toTest.getPotentialUsers(testClientId, testCorrelationId, testText)

      //then
      result.then(potentialUsers => {
        assert.strictEqual(potentialUsers.length, 999)
        done()
      }).catch((err) => {
        assert.fail(err)
        done()
      })
    })

    it('should filter out all non-potential users', (done) => {
      //given
      let toTest = userResolver.newUserResolver('<baseUrl>')
      toTest.filterPotentialUsers = () => {
        return []
      }
      toTest.$userServiceClient = {
        GetUsers(clientId, correlationId, offset, limit){
          return Promise.resolve([
              {id: "0", names: [`Name #0`]}
          ])
        }
      }

      //when
      let result = toTest.getPotentialUsers('', '', [''])

      //then
      result.then(potentialUsers => {
        assert.strictEqual(potentialUsers.length, 0)
        done()
      }).catch((err) => {
        assert.fail(err)
        done()
      })
    })

    it('should ignore broken pages', (done) => {
      //given
      let toTest = userResolver.newUserResolver('<baseUrl>')
      toTest.filterPotentialUsers = (users) => {
        return users.map(u => {return {...u, confidence: 0}})
      }
      toTest.$userServiceClient = {
        firstCall: true,

        // @ts-ignore
        GetUsers(clientId, correlationId, offset, limit = 0){
          if(offset === 0) {
            //first page
            let users = []
            for(let i=0; i < limit; i ++){
              // @ts-ignore
              users.push({id: `${i}`, names: [`Name #${i}`]})
            }
            return Promise.resolve(users)
          } else{
            //second (last) page
            return Promise.resolve({}) //non-array
          }
        }
      }

      //when
      let result = toTest.getPotentialUsers('', '', [''])

      //then
      result.then(potentialUsers => {
        assert.strictEqual(potentialUsers.length, 500)
        done()
      }).catch((err) => {
        assert.fail(err)
        done()
      })
    })

  })

  describe('ResolveUserId', () => {

    it(`should return the user's id`, (done) => {
      //given
      let toTest = userResolver.newUserResolver('<baseUrl>')
      const testClientId = '<clientId>'
      const testCorrelationId = '<correlationId>'
      const testText = ['<text#1>', '<text#2>']
      toTest.getPotentialUsers = (clientId, correlationId, text) => {
        assert.strictEqual(clientId, testClientId)
        assert.strictEqual(correlationId, testCorrelationId)
        assert.strictEqual(text, testText)

        return Promise.resolve([{
          id: "1", names: ['Name'], confidence: 100
        }])
      }

      //when
      let result = toTest.ResolveUserId(testClientId, testCorrelationId, testText)

      //then
      result.then(userId => {
        assert.strictEqual(userId, "1")
        done()
      }).catch((err) => {
        assert.fail(err)
        done()
      })
    })

    it(`should return the best user's id`, (done) => {
      //given
      let toTest = userResolver.newUserResolver('<baseUrl>')
      const testClientId = '<clientId>'
      const testCorrelationId = '<correlationId>'
      const testText = ['<text#1>', '<text#2>']
      toTest.getPotentialUsers = (clientId, correlationId, text) => {
        assert.strictEqual(clientId, testClientId)
        assert.strictEqual(correlationId, testCorrelationId)
        assert.strictEqual(text, testText)

        return Promise.resolve([
          { id: "2", names: ['Name'], confidence: 80 },
          { id: "1", names: ['Name'], confidence: 100}
        ])
      }

      //when
      let result = toTest.ResolveUserId(testClientId, testCorrelationId, testText)

      //then
      result.then(userId => {
        assert.strictEqual(userId, "1")
        done()
      }).catch((err) => {
        assert.fail(err)
        done()
      })
    })

    it(`should return null if no user was matched`, (done) => {
      //given
      let toTest = userResolver.newUserResolver('<baseUrl>')
      toTest.getPotentialUsers = () => {
        return Promise.resolve([])
      }

      //when
      let result = toTest.ResolveUserId('', '', [''])

      //then
      result.then(userId => {
        assert.strictEqual(userId, null)
        done()
      }).catch((err) => {
        assert.fail(err)
        done()
      })
    })

    it(`should return null if no user was matched #2`, (done) => {
      //given
      let toTest = userResolver.newUserResolver('<baseUrl>')
      // @ts-ignore
      toTest.getPotentialUsers = () => {
        return Promise.resolve(null)
      }

      //when
      let result = toTest.ResolveUserId('', '', [''])

      //then
      result.then(userId => {
        assert.strictEqual(userId, null)
        done()
      }).catch((err) => {
        assert.fail(err)
        done()
      })
    })

  })

})
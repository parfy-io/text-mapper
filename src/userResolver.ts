import userService = require("./client/userService");
import FuzzySet = require("fuzzyset.js");

interface PotentialUser extends userService.User {
  confidence: number
}

export const newUserResolver = (userServiceBaseUrl : string, userServiceApiKey : string | undefined, minConfidence : number = 90) => {
  return {
    $userServiceClient: userService.newUserService(userServiceBaseUrl, userServiceApiKey),

    filterPotentialUsers(users : Array<userService.User>, text: Array<string>) : Array<PotentialUser> {
      let fuzzySet = FuzzySet(text, false)
      let discoveries = {}

      for(let curUser of users) {
        let normalizedName = curUser.names.join(' ')

        let results = fuzzySet.get(normalizedName) || []
        let confidence = 0

        for(let result of results) {
          let curConfidence = result[0] * 100
          if(confidence < curConfidence) {
            confidence = curConfidence
          }
        }

        if(confidence >= minConfidence) {
          discoveries[curUser.id] = confidence
        }
      }

      return users.filter(u => discoveries[u.id]).map(user => {
        return {
          ...user,
          confidence: discoveries[user.id]
        }
      })
    },

    getPotentialUsers: async function(clientId : string, correlationId: string, text: Array<string>) : Promise<Array<PotentialUser>> {
      const limit = 500
      let potentialUsers = []
      let lastPage = false
      for(let offset = 0; !lastPage ; offset += limit) {
        let users = await this.$userServiceClient.GetUsers(clientId, correlationId, offset, limit)
          .then(userOrError => {
            if(Array.isArray(userOrError)) return userOrError
            else return []
          })
          .then(users => {
            if(users.length < limit) {
              lastPage = true
            }
            return users
          })
          .then(users => this.filterPotentialUsers(users, text))

        // @ts-ignore im sure that at this points "users" will be an (empty) array of users
        potentialUsers.push(...users)
      }

      return potentialUsers
    },

    ResolveUserId(clientId : string, correlationId: string, text: Array<string>): Promise<string | null> {
      return this.getPotentialUsers(clientId, correlationId, text)
        .then(users => {
          if(users && users.length > 0) {
            users.sort((a, b) => b.confidence - a.confidence)
            return users[0].id
          }
          return null
        })
    }
  }
}
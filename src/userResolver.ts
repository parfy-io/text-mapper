import userService = require("./client/userService");
import Fuse = require("fuse.js");

const score2confidence = (score) => (1 - score) * 100
const percentage2score = (percentage) =>  1 - (percentage / 100)

interface PotentialUser extends userService.User {
  confidence: number
}

export const newUserResolver = (userServiceBaseUrl : string, minConfidence : number = 90) => {
  return {
    $userServiceClient: userService.newUserService(userServiceBaseUrl),
    $fuseOptions: {
      caseSensitive: false,
      shouldSort: true,
      includeScore: true,
      location: 0,
      threshold: percentage2score(minConfidence),
      distance: 100,
      keys: ['fullName']
    },

    filterPotentialUsers(users : Array<userService.User>, text: Array<string>) : Array<PotentialUser> {
      let preparedUsers = users.map(user => {
        return {
          id: user.id,
          fullName: user.names.join(' ')
        }
      })
      let fuse = new Fuse(preparedUsers, this.$fuseOptions)
      let discoveries = {}

      for(let curText of text) {
        for(let result of fuse.search(curText)){
          // @ts-ignore
          let userId = result.item.id
          // @ts-ignore
          let confidence = score2confidence(result.score)

          if(!discoveries[userId]) discoveries[userId] = 0
          if(discoveries[userId] < confidence) discoveries[userId] = confidence
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
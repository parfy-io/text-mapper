import axios = require("axios");

export interface User {
  id: string
  names: Array<string>
}

export interface UserService {
  GetUsers(clientId: string, correlationId: string, offset?: number, limit?: number): Promise<Array<User> | Error>

  [propName: string]: any;
}

export const newUserService = (baseUrl : string) : UserService => {

  return {
    $client: axios.default,

    GetUsers(clientId: string, correlationId: string, offset: number = 0, limit: number = 500): Promise<Array<User> | Error> {
      return this.$client.get(`${baseUrl}/v1/clients/${clientId}/users`, {
        headers: {
          "X-Correlation-Id": correlationId,
          "User-Agent": "text-mapper"
        },
        params: {
          "offset": offset,
          "limit": limit,
        }
      }).then(resp => {
        if(!resp || !resp.data) {
          throw new Error("Error while calling UserService: the response is invalid.")
        }

        return resp.data
      })
    }
  }
}
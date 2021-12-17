import axios = require("axios");

export interface User {
  id: string
  names: Array<string>
}

export interface UserService {
  GetUsers(clientId: string, correlationId: string, offset?: number, limit?: number): Promise<Array<User> | Error>

  [propName: string]: any;
}

export const gqlGetUsers = `query GetUsers($clientName: String, $offset: Int, $limit: Int) {
  employees(filters: {
    client: {name: {eq: $clientName}}
  }, pagination: { start: $offset, limit: $limit}) {
    data {
      id
      attributes {
        names
      }
    }
  }
}`

export const newUserService = (baseUrl: string, apiKey: string | undefined = undefined) : UserService => {
  const defaultHeaders = {
    "User-Agent": "text-mapper"
  }
  if(apiKey) {
    defaultHeaders['Authorization'] = `Bearer ${apiKey}`
  }

  return {
    $client: axios.default,

    graphql(query: string, variables: any, correlationId: string): Promise<axios.AxiosResponse> {
      return this.$client.post(`${baseUrl}`, { query, variables }, {
        headers: {
          ...defaultHeaders,
          "X-Correlation-Id": correlationId,
        }
      })
    },

    GetUsers(clientName: string, correlationId: string, offset: number = 0, limit: number = 500): Promise<Array<User> | Error> {
      const variables = {
        clientName, offset, limit
      }
      return this.graphql(gqlGetUsers, variables, correlationId).then(resp => {
        if(!resp || !resp.data || !resp.data.data || !resp.data.data.employees || !resp.data.data.employees.data) {
          throw new Error("Error while calling UserService: the response is invalid.")
        }

        return resp.data.data.employees.data.map(employee => {
          return {
            id: employee.id, names: employee.attributes.names
          }
        })
      })
    }
  }
}
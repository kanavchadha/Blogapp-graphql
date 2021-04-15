const { buildSchema }  = require("graphql");

module.exports = buildSchema(`
    type Post{
        _id: ID!
        title: String!
        content: String!
        imageUrl: String!
        creator: User!
        claps: Claps!
        createdAt: String!
        updatedAt: String!
    }
    type User {
        _id: ID!
        email: String!
        name: String!
        password: String
        status: String!
        posts: [Post!]!
    }
    type AuthData{
        token: String!
        userId: String!
    }
    type PostsData{
        totalPosts: Int!
        posts: [Post!]!
    }
    type Claps{
        totalClaps: Int!
        clap: [ID!]
    }

    input UserData {
        email: String!
        name: String!
        password: String!
    }
    input PostData {
        title: String!
        imageUrl: String!
        content: String!
        
    }

    type RootMutation {
        createUser(userInput: UserData): User!
        createPost(postInput: PostData): Post!
        updatePost(id: ID!,postInput: PostData): Post!
        deletePost(postId: ID!): Boolean!
        setStatus(status: String!): Boolean!
        clap(postId: ID!): Claps!
    }
    type RootQuery {
        login(email: String!, password: String!): AuthData!
        posts(page: Int!): PostsData!
        post(postId: ID!): Post!
        currUser: User!
    }
    schema {
        query: RootQuery
        mutation: RootMutation
    }
`)

// input is a keyword which is used for declaring types of data specifically which will be used in arguments we want to recieve in mutation.
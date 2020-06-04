const express = require("express");
const { ApolloServer, gql, PubSub } = require("apollo-server-express");
const socketIo = require("socket.io");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const pubsub = new PubSub();
const MESSAGE_ADDED = "MESSAGE_ADDED";

const messages = [];
const resolvers = {
  Subscription: {
    addedMessage: {
      // Additional event labels can be passed to asyncIterator creation
      subscribe: () => pubsub.asyncIterator([MESSAGE_ADDED]),
    },
  },
  Query: {
    messages: () => messages,
  },
  Mutation: {
    addMessage: (_, data, test) => {
      const message = data.message;
      message.id = messages.length.toString();
      message.date = Date.now();
      messages.push(message);

      pubsub.publish(MESSAGE_ADDED, { addedMessage: message });
      io.sockets.emit("CHAT_MESSAGE_ADDED", message);
      return {
        success: true,
        message,
      };
    },
  },
};

const typeDefs = gql`
  type ChatMessage {
    id: String
    text: String
    author: String
    date: Float
    userId: String
  }

  input ChatMessageInput {
    text: String
    author: String
    userId: String
  }

  type Book {
    title: String
    author: String
  }

  type AddMessageResponse {
    success: Boolean!
    message: ChatMessage
  }

  type Mutation {
    addMessage2(input: String!): AddMessageResponse
    addMessage(message: ChatMessageInput): AddMessageResponse
  }

  type Subscription {
    addedMessage: ChatMessage
  }

  type Query {
    messages: [ChatMessage]
  }
`;

io.on("connection", (client) => {
  client.on("ADD_CHAT_MESSAGE", (message) => {
    message.id = messages.length.toString();
    message.date = Date.now();
    messages.push(message);

    client.emit("CHAT_MESSAGE_ADDED", message);
  });
});

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
});

apolloServer.applyMiddleware({ app });

app.use(
  express.static("dist", {
    maxAge: "30d",
  })
);

app.use(
  express.static("assets", {
    maxAge: "30d",
  })
);

app.all("*", function (req, res) {
  res.sendFile("index.html", { root: __dirname + "/dist" });
});

server.listen(4000, function () {
  console.log(
    `🚀 Server ready at http://localhost:4000${apolloServer.graphqlPath}`
  );
  const host = server.address().address;
  const port = server.address().port;

  console.info("App listening at http://%s:%s", host, port);
});

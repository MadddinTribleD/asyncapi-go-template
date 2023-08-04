import { File } from '@asyncapi/generator-react-sdk';

export default function({ params}) {
  const content = 
  `package ${params.packageName}

import (
  "github.com/rabbitmq/amqp091-go"
)

type PublishFunc func(payload []byte) bool

type Channel struct {
  Name    string
  Publish PublishFunc
}

type Channels []Channel

type MessageController interface {
  Channels() Channels
}

func NewQueue(conn *amqp091.Connection, messageControllers ...MessageController) {
  var forever chan struct{}

  for _, m := range messageControllers {
    for _, c := range m.Channels() {
      channel, err := conn.Channel()

      queue, err := channel.QueueDeclare(
        c.Name,
        true,   // durable
        false,   // delete when unused
        false,   // exclusive
        false,   // no-wait
        nil,     // arguments
      )

      msgs, err := channel.Consume(
        queue.Name, // queue
        "",     // consumer
        false,  // auto-ack
        false,  // exclusive
        false,  // no-local
        false,  // no-wait
        nil,    // args
      )

      if err != nil {
        panic(err)
      }

      go func(c *Channel, msgs <-chan amqp091.Delivery) {
        for {
          msg, ok := <-msgs
          if !ok {
            break
          }

          ack := c.Publish(msg.Body)

          if ack {
            msg.Ack(false)
          } else {
            msg.Nack(false, true)
          }
        }
      }(&c, msgs)
    }
  }

  <-forever
}
`;
  return (
    <File name="controller.go">
      {content}
    </File>
  );
}
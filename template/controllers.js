import { File } from '@asyncapi/generator-react-sdk';

function findAllPublishChannelsWithTag(tagName, channels) {
  return channels.filter(([channelName, channel]) => {
    const publish = channel.publish();
    if (publish === null) {
      return false;
    }

    const tags = publish.tags();
    if (tags === null) {
      return false;
    }

    return tags.some(t => t.name() === tagName);
  });
}

function createServiceInterface(tagName, allChannels) {
  const publishChannels = findAllPublishChannelsWithTag(tagName, allChannels);

  const channels = publishChannels.map(([channelName, channel]) => {
    const publish = channel.publish();
    const payload = publish.message().payload();

    return `${publish.id()}(${payload.ext('x-parser-schema-id')})`;
  });

  return `
type ${tagName}Servicer interface {
  ${channels.join('\n')}
}`;
}

function createNewHandlerFunction(name) {
  return `
func New${name}MessageController(s ${name}Servicer) MessageController {
  handler := &${name}MessageController{
    service: s,
  }
  return handler
}
  `;
}

function createHandlerStruct(name) {
  return `
type ${name}MessageController struct {
  service ${name}Servicer
}
  `;
}

function createChannels(tagName, allChannels) {
  const publishChannels = findAllPublishChannelsWithTag(tagName, allChannels);

  const channels = publishChannels.map(([channelName, channel]) => {
    const publish = channel.publish();

    return `{
      "${channelName}",
      c.${publish.id()},
    },`;
  });

  let text = `func (c *${tagName}MessageController) Channels() Channels {
  return Channels{
    ${channels.join('\n')}
  }
}`;

  const functions = publishChannels.map(([channelName, channel]) => {
    const publish = channel.publish();

    return `
func (c *${tagName}MessageController) ${publish.id()}(payloadByte []byte) {
  payload := &${publish.message().payload().ext('x-parser-schema-id')}{}
  json.Unmarshal(payloadByte, &payload)

  c.service.${publish.id()}(*payload)
}`;
  });

  text += '\n';
  text += functions.join('\n');

  return text;
} 

function createMessageControllerFromTag(tag, asyncapi, params) {
  const tagName = tag.name();
  const channels = Object.entries(asyncapi.channels());

  return (
    <File name={`controller_${tagName}.go`}>
      package { params.packageName }
      {`

import (
  "encoding/json"
)`}
      {'\n'}
      {createServiceInterface(tagName, channels)}
      {'\n'}
      {createHandlerStruct(tagName)}
      {'\n'}
      {createNewHandlerFunction(tagName)}
      {'\n'}
      {createChannels(tagName, channels)}
    </File>
  );
}

export default function({ asyncapi ,params}) {
  const tags = asyncapi.tags();

  return tags.map(tag => {
    return createMessageControllerFromTag(tag, asyncapi, params);
  });
}

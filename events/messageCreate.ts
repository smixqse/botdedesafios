import { Message } from 'discord.js';
import config from './../config';

function chatEventsHandler (message: Message) {
  if (!config.events.channels.includes(message.channelId)) return;

  
}

const event = (message: Message) => {
  if (message.guildId !== config.guildId) return;

  if (config.events.enabled) chatEventsHandler(message);
};

export default {
  event,
  once: false
};

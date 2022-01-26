import { Message } from 'discord.js';
import config from './../config';

function chatEventsHandler (message: Message) {
  if (!config.challenges.channels.includes(message.channelId)) return;

  
}

const event = (message: Message) => {
  if (message.guildId !== config.guildId) return;

  if (config.challenges.enabled) chatEventsHandler(message);
};

export default {
  event,
  once: false
};

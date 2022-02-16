import { client } from '..';
import config from '../config';

const event = () => {
  console.log('caching stuff...');
  client.guilds.fetch(config.guildId).then(async (guild) => {
    //await guild.members.fetch();
    console.log('ready');
  });
};

export default {
  event,
  once: true
};

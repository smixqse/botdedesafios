import { client } from '..';
import config from '../config';
import { getRandomFrom } from '../utils';

const event = () => {
  console.log('caching stuff...');
  client.guilds.fetch(config.guildId).then(async (guild) => {
    await guild.members.fetch();
    console.log('ready');

    const changeStatus = async () => {
      const randomActivity = getRandomFrom(config.statusMessages);
      client.user?.setActivity({
        name: randomActivity.text,
        type: randomActivity.type as any
      });
    };

    setInterval(changeStatus, config.statusMessagesInterval);
    changeStatus();
  });
};

export default {
  event,
  once: true
};

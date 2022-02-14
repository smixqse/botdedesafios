import { GuildMember, Message, TextChannel } from 'discord.js';
import { channelTracking } from '..';
import { ChallengeName, challenges, startChallenge } from '../chatEvents';
import { getRandomFrom, getRandomNumberBetween } from '../utils';
import config from './../config';

function chatChallengesHandler(message: Message) {
  if (!config.challenges.channels.includes(message.channelId)) return;
  const getNewMessageCount = () =>
    getRandomNumberBetween(
      config.challenges.messagesToWait.min,
      config.challenges.messagesToWait.max
    );

  const obj = channelTracking.ensure(message.channelId, {
    messageCount: 0,
    nextMessageCount: getNewMessageCount()
  });

  if (obj.nextMessageCount === obj.messageCount) {
    const normalChallengeNames = Object.entries(challenges)
      .filter((a) => a[1].type === 'normal')
      .map((a) => a[0]);
    const rareChallengeNames = Object.entries(challenges)
      .filter((a) => a[1].type === 'rare')
      .map((a) => a[0]);
    const challengeName =
      getRandomNumberBetween(1, 4) === 1
        ? (getRandomFrom(rareChallengeNames) as ChallengeName)
        : (getRandomFrom(normalChallengeNames) as ChallengeName);
    const challenge = challenges[challengeName];
    startChallenge(
      challengeName,
      message.channel as TextChannel,
      message.member as GuildMember,
      challenge.run
    );

    channelTracking.set(message.channelId, {
      messageCount: 0,
      nextMessageCount: getNewMessageCount()
    });
  } else {
    channelTracking.math(message.channelId, '+', 1, 'messageCount');
  }
}

const event = (message: Message) => {
  if (message.guildId !== config.guildId) return;

  if (config.challenges.enabled) chatChallengesHandler(message);
};

export default {
  event,
  once: false
};

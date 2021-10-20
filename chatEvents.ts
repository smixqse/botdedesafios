import {
  Collection,
  CollectorFilter,
  ColorResolvable,
  GuildMember,
  Message,
  MessageEmbed,
  Snowflake,
  TextChannel
} from 'discord.js';
import config from './config';
import {
  getRandomFrom,
  getRandomNumberBetween,
  removeDuplicates,
  removeDuplicatesBy
} from './utils';

type EventType = 'normal' | 'rare';
type AwaitMessagesResponse = Collection<Snowflake, Message>;
type ChatEvent = (
  eventName: string,
  author: GuildMember,
  channel: TextChannel,
  eventEnd: typeof eventEndFunction
) => void;

const awaitMessages = (
  channel: TextChannel,
  filter: CollectorFilter<[Message]>,
  thenFunc: (collection: AwaitMessagesResponse) => void,
  catchFunc: (collection: AwaitMessagesResponse) => void,
  max = 1,
  time = config.events.time,
  finallyFunc?: () => void
) => {
  channel
    .awaitMessages({ filter, max, time, errors: ['time'] })
    .then(thenFunc)
    .catch(catchFunc)
    .finally(finallyFunc);
};

const givePoints = (winners: GuildMember[], amount: number) => {
  // TODO: código de dar pontos pros que ganharam
};

const replaceWinningMessage = (
  message: string,
  winners: GuildMember[],
  amount: number
) => {
  return `${message.replace(
    '{0}',
    `${winners.join(', ')} ${
      winners.length > 1 ? 'ganharam' : 'ganhou'
    } ${amount} pontos`
  )}`;
};

const deleteEventTries = (
  channel: TextChannel,
  startMessage: Message,
  filter: (message: Message) => boolean,
  timeout = 1500
) => {
  setTimeout(async () => {
    const messages = await channel.messages.fetch({ after: startMessage.id });
    const filteredMessages = messages.filter(filter);
    channel.bulkDelete(filteredMessages);
  }, timeout);
};

const getMessage = (
  eventName: EventName,
  winners: GuildMember[],
  amount: number,
  additional?: string
) => {
  const won = winners.length > 0;
  const genericMessages = won
    ? config.events.genericMessages.won
    : config.events.genericMessages.lost;
  const list: string[] = [
    ...events[eventName].messages[won ? 'won' : 'lost'],
    ...genericMessages
  ];
  const selectedMessage = getRandomFrom(list);
  if (won) {
    return (
      replaceWinningMessage(selectedMessage, winners, amount) + ` ${additional}`
    );
  } else {
    return `${selectedMessage} ${additional}`;
  }
};

const createEmbed = (message: string, type: EventType) => {
  return new MessageEmbed()
    .setColor(config.events.colors[type] as ColorResolvable)
    .setDescription(`🎉 | ${message}`);
};

const eventStartFunction = async (
  initialMessage: string,
  channel: TextChannel,
  eventType: EventType,
  amount: number
) => {
  return await channel.send({
    embeds: [
      createEmbed(`valendo ${amount} pontos, ${initialMessage}`, eventType)
    ]
  });
};

const eventEndFunction = (
  winners: GuildMember[],
  channel: TextChannel,
  eventName: EventName,
  amount = config.events.winPoints[0],
  additional?: string
) => {
  const eventType: EventType = events[eventName].type as EventType;
  channel.send({
    embeds: [
      createEmbed(
        getMessage(eventName, winners, amount, additional || ''),
        eventType
      )
    ]
  });

  givePoints(winners, amount);
};

export const runEvent = (
  eventName: EventName,
  author: GuildMember,
  channel: TextChannel,
  event: ChatEvent
) => event(eventName, author, channel, eventEndFunction);

const createMessageEvent = (
  generateTarget: () => {
    initialMessage: string;
    additional: string;
    filter: CollectorFilter<[Message]>;
    amount: number;
  },
  deleteFilter?: (message: Message) => boolean,
  max?: number,
  time?: number
) => {
  return async (
    eventName: EventName,
    channel: TextChannel,
    author: GuildMember
  ) => {
    const { initialMessage, additional, filter, amount } = generateTarget();

    const startMessage = await eventStartFunction(
      initialMessage,
      channel,
      events[eventName].type as EventType,
      amount
    );

    awaitMessages(
      channel,
      filter,
      (messages) => {
        eventEndFunction(
          messages.map((a) => a.member as NonNullable<GuildMember>),
          channel,
          eventName,
          amount,
          additional
        );
      },
      () => {
        eventEndFunction([], channel, eventName, amount, additional);
      },
      max,
      time,
      () => {
        if (deleteFilter) deleteEventTries(channel, startMessage, deleteFilter);
      }
    );
  };
};

interface Events {
  [key: string]: {
    type: EventType;
    messages: {
      won: string[];
      lost: string[];
    };
    run: any;
  };
}

export type EventName = 'math' | 'luckyNumber';

export const events: Events = {
  math: {
    type: 'normal',
    messages: {
      won: ['tá bom nas matemáticas, né? {0}.'],
      lost: ['ninguém soube calcular rápido o suficiente.']
    },
    run: createMessageEvent(
      () => {
        const operations = [
          () => {
            const first = getRandomNumberBetween(1, 900);
            const last = getRandomNumberBetween(1, 700);
            return { operation: `${first} + ${last}`, result: first + last };
          },
          () => {
            const first = getRandomNumberBetween(1, 900);
            const last = getRandomNumberBetween(1, 500);
            return { operation: `${first} - ${last}`, result: first - last };
          },
          () => {
            const first = getRandomNumberBetween(1, 30);
            const last = getRandomNumberBetween(2, 5);
            return { operation: `${first} * ${last}`, result: first * last };
          },
          () => {
            const first = getRandomNumberBetween(1, 900);
            const verifiedFirst = first % 2 !== 0 ? first + 1 : first;
            const last = 2;
            return {
              operation: `${verifiedFirst} / ${last}`,
              result: verifiedFirst / last
            };
          }
        ];

        const decideOperation = getRandomNumberBetween(0, 3);
        const { operation, result } = operations[decideOperation]();
        return {
          initialMessage: `quanto é ${operation}?`,
          additional: `a resposta era ${result}.`,
          filter: (message) => Number(message.content) === result,
          amount: config.events.winPoints[1]
        };
      },
      (message) => {
        const number = Number(message.content);
        if (number) {
          return true;
        } else {
          return false;
        }
      }
    )
  },
  luckyNumber: {
    type: 'normal',
    messages: {
      won: ['que sorte! {0}.'],
      lost: ['tão de azar hoje! ninguém ganhou.']
    },
    run: (eventName: EventName, channel: TextChannel, author: GuildMember) => {
      const eventType = events[eventName].type as EventType;
      const amount = config.events.winPoints[1];

      const theNumber = getRandomNumberBetween(1, 10);
      eventStartFunction(
        'digite no chat um número de 1 a 10! vamos sortear daqui a pouco.',
        channel,
        eventType,
        amount
      );

      awaitMessages(
        channel,
        (message) =>
          !isNaN(Number(message.content)) &&
          Number(message.content) >= 1 &&
          Number(message.content) <= 10,
        (collection) => {
          return collection;
        },
        (collection) => {
          const members = collection.map((a) => a.member);
          const messages = collection.map((a) => a);
          const usersWithoutDuplicates = [...new Set(members)] as GuildMember[];
          const messagesWithoutDuplicates = removeDuplicatesBy(
            (x) => x.author.id,
            messages
          );
          const winningMembers = messagesWithoutDuplicates
            .filter((a) => Number(a.content) === theNumber)
            .map((a) => a.member) as GuildMember[];
          const duplicates = removeDuplicates(
            members.filter((item, index) => members.indexOf(item) !== index)
          );

          const messageToSend =
            (winningMembers.length > 0
              ? replaceWinningMessage(
                  getRandomFrom(events.luckyNumber.messages.won),
                  winningMembers,
                  amount
                )
              : getRandomFrom(events.luckyNumber.messages.lost)) +
            ` o número era ${theNumber}.` +
            (duplicates.length > 0
              ? `\n\ne para ${duplicates.join(
                  ', '
                )}: apenas o primeiro número enviado vale.`
              : '');
          console.log(
            winningMembers.map((a) => a!.user.username),
            duplicates.map((a) => a!.user.username)
          );

          channel.send({
            embeds: [createEmbed(messageToSend, eventType)]
          });

          givePoints(winningMembers, amount);
        },
        30,
        10000
      );
    }
  }
};

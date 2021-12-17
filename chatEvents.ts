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
import { send } from 'process';
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
  channel: TextChannel,
  author: GuildMember,
  eventEnd: typeof eventEndFunction
) => void;

type Intervention =
  | {
      channel: TextChannel;
      type: 'steal';
      creator: GuildMember;
    }
  | {
      channel: TextChannel;
      type: 'bet';
      creator: GuildMember;
      bet: GuildMember;
    };

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

const interventionChecker = (channel: TextChannel): Intervention | null => {
  return {
    channel,
    type: 'steal',
    creator: channel.guild.members.resolve(config.ownerId) as GuildMember
  };

  // TODO: pegar intervenção atual no canal na database
};

const givePoints = (winners: GuildMember[], amount: number) => {
  // TODO: código de dar pontos pros que ganharam
};

const replaceMessage = (message: string, ...args: string[]) => {
  let returnedMessage = message;
  for (const arg in args) {
    returnedMessage = returnedMessage.replace(`{${arg}}`, args[arg]);
  }
  return returnedMessage;
};

const wonWord = (winners: GuildMember[]) =>
  winners.length > 1 ? 'ganharam' : 'ganhou';

const replaceResultMessage = (
  message: string,
  winners: GuildMember[],
  amount: number
) => {
  return replaceMessage(
    message,
    `${winners.join(', ')} ${wonWord(winners)} ${amount} pontos`
  );
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
  amount: number
) => {
  const won = winners.length > 0;
  const list: string[] = [...events[eventName].messages[won ? 'won' : 'lost']];
  const selectedMessage = getRandomFrom(list);
  if (won) {
    return replaceResultMessage(selectedMessage, winners, amount);
  } else {
    return selectedMessage;
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
  channel: TextChannel,
  message: string,
  additional: string,
  eventName: EventName,
  intervention: Intervention | null,
  winners: GuildMember[],
  amount = config.events.winPoints[0]
) => {
  const eventType = events[eventName].type as EventType;
  const won = winners.length > 0;

  const defaultAction = () => {
    channel.send({
      embeds: [createEmbed(`${message} ${additional}`, eventType)]
    });

    givePoints(winners, amount);
  };

  if (intervention) {
    if (intervention.type === 'steal') {
      if (won) {
        channel.send({
          embeds: [
            createEmbed(
              `${winners.join(', ')} ${wonWord(winners)}, ${replaceMessage(
                config.events.interventionMessages.steal,
                intervention.creator.toString()
              )} ${additional}`,
              eventType
            )
          ]
        });
      } else {
        defaultAction();
      }
    } else if (intervention.type === 'bet') {
      const wonBet = winners.includes(intervention.bet);
      const toAppend = won
        ? wonBet
          ? config.events.interventionMessages.betWin
          : config.events.interventionMessages.betLose
        : config.events.interventionMessages.betNoWinner;
      const giveToBetter = wonBet ? amount * 2 : -amount;

      channel.send({
        embeds: [
          createEmbed(
            `${winners.join(', ') || 'ninguém'} ${wonWord(
              winners
            )}, ${replaceMessage(
              toAppend,
              intervention.creator.toString()
            )} ${additional}`,
            eventType
          )
        ]
      });
      givePoints(winners, amount);
      givePoints([intervention.creator], giveToBetter);
    }
  } else {
    defaultAction();
  }
};

export const runEvent = (
  eventName: EventName,
  channel: TextChannel,
  author: GuildMember,
  event: ChatEvent
) => event(eventName, channel, author, eventEndFunction);

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

    const eventType = events[eventName].type as EventType;

    const startMessage = await eventStartFunction(
      initialMessage,
      channel,
      eventType,
      amount
    );

    awaitMessages(
      channel,
      filter,
      (messages) => {
        const winners = messages.map(
          (m) => m.member as NonNullable<GuildMember>
        );

        eventEndFunction(
          channel,
          getMessage(eventName, winners, amount),
          additional,
          eventName,
          interventionChecker(channel),
          winners,
          amount
        );
      },
      () => {
        eventEndFunction(
          channel,
          getMessage(eventName, [], amount),
          additional,
          eventName,
          interventionChecker(channel),
          [],
          amount
        );
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
    run: async (
      eventName: EventName,
      channel: TextChannel,
      author: GuildMember
    ) => {
      const eventType = events[eventName].type as EventType;
      const amount = config.events.winPoints[1];

      const theNumber = getRandomNumberBetween(1, 10);
      const startMessage = await eventStartFunction(
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
          const members = collection.map((a) => a.member) as GuildMember[];
          const messages = collection.map((a) => a);
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
              ? replaceResultMessage(
                  getRandomFrom(events.luckyNumber.messages.won),
                  winningMembers,
                  amount
                )
              : getRandomFrom(events.luckyNumber.messages.lost)) +
            ` o número era ${theNumber}.`;
          const additional =
            duplicates.length > 0
              ? `\n\n⚠ atenção, ${duplicates.join(
                  ', '
                )}: apenas o primeiro número enviado vale.`
              : '';

          eventEndFunction(
            channel,
            messageToSend,
            additional,
            eventName,
            interventionChecker(channel),
            winningMembers,
            amount
          );

          deleteEventTries(channel, startMessage, (message) => {
            const content = Number(message.content);
            return !!content && content >= 0 && content <= 10;
          });
        },
        30,
        10000
      );
    }
  }
  // TODO: resto dos eventos
};

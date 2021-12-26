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
  /*return {
    channel,
    type: 'steal',
    creator: channel.guild.members.resolve(config.ownerId) as GuildMember
  };*/

  return null;

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
    deleteFilter: (message: Message) => boolean;
    amount: number;
    appendToFinalMessage?: (initialMessage: Message) => Promise<string>;
  },
  max?: number,
  time?: number
) => {
  return async (
    eventName: EventName,
    channel: TextChannel,
    author: GuildMember
  ) => {
    const {
      initialMessage,
      additional,
      filter,
      deleteFilter,
      amount,
      appendToFinalMessage
    } = generateTarget();

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
      async (messages) => {
        const winners = messages.map(
          (m) => m.member as NonNullable<GuildMember>
        );

        const toAppend = appendToFinalMessage
          ? await appendToFinalMessage(startMessage)
          : '';

        eventEndFunction(
          channel,
          getMessage(eventName, winners, amount) + toAppend,
          additional,
          eventName,
          interventionChecker(channel),
          winners,
          amount
        );
      },
      async () => {
        const toAppend = appendToFinalMessage
          ? await appendToFinalMessage(startMessage)
          : '';

        eventEndFunction(
          channel,
          getMessage(eventName, [], amount) + toAppend,
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

export type EventName = 'math' | 'luckyNumber' | 'alphabet' | 'fastType';

export const events: Events = {
  math: {
    type: 'normal',
    messages: {
      won: ['tá bom nas matemáticas, né? {0}.'],
      lost: ['ninguém soube calcular rápido o suficiente.']
    },
    run: createMessageEvent(() => {
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
        deleteFilter: (message) => !!Number(message.content),
        amount: config.events.winPoints[1]
      };
    })
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
  },
  alphabet: {
    type: 'normal',
    messages: {
      won: [
        'esse olho tá treinado! {0}.',
        'boa, conseguiu achar! {0}.',
        'nice! {0}.'
      ],
      lost: [
        'nossa, tava tão escondida assim?',
        'puts, parece que não conseguiram achar.',
        'demoraram demais pra achar!'
      ]
    },
    run: createMessageEvent(() => {
      const amounts = config.events.winPoints;
      const alphabet = 'abcdefghijklmnopqrstuvwxyz';
      const removeRandomCharacterFrom = (text: string) => {
        const letter = getRandomFrom(text.split(''));
        return { text: text.replace(letter, ''), letter };
      };
      const variation = getRandomFrom([
        { name: 'normal', amount: amounts[0] } as const,
        { name: 'reverse', amount: amounts[1] } as const,
        { name: 'shuffle', amount: amounts[2] } as const
      ]);

      const variationData = (() => {
        switch (variation.name) {
          case 'normal':
            return removeRandomCharacterFrom(alphabet);
          case 'reverse':
            const reversed = alphabet.split('').reverse().join('');
            return removeRandomCharacterFrom(reversed);
          case 'shuffle':
            let toShuffle = alphabet;
            for (let i = 0; i < getRandomNumberBetween(5, 15); i++) {
              const first = getRandomFrom(toShuffle.split(''));
              const second = getRandomFrom(toShuffle.split(''));
              toShuffle = toShuffle
                .replace(second, first)
                .replace(first, second);
            }
            return removeRandomCharacterFrom(toShuffle);
        }
      })();
      return {
        initialMessage: `qual letra está faltando aqui? (\`${variationData.text}\`)`,
        additional: `a letra era ${variationData.letter.toUpperCase()}.`,
        filter: (message) =>
          message.content.toLowerCase() === variationData.letter,
        deleteFilter: (message) => message.content.length <= 2,
        amount: variation.amount
      };
    })
  },
  fastType: {
    type: 'normal',
    messages: {
      won: ['que mãos rápidas, hein? {0}.', 'temos o The Flash aqui! {0}.'],
      lost: [
        'ninguém foi rápido o suficiente!',
        'ninguém escreveu rápido o suficiente. treinem melhor esses dedos na próxima!',
        'vocês digitam devagar demais!'
      ]
    },
    run: createMessageEvent(() => {
      const parts = config.events.fastTypeParts;
      const isFem = getRandomFrom([false, true]);
      const names = isFem ? parts.names.fem : parts.names.masc;
      const occupations = isFem
        ? parts.occupations.fem
        : parts.occupations.masc;
      const formats = [
        // exemplo: Renata me disse que viajou para outro país
        `${getRandomFrom(names)} ${getRandomFrom(parts.said)} ${getRandomFrom(
          parts.actionsOne
        )}`,

        // exemplo: Um professor chamado Ricardo odeia dormir
        `${getRandomFrom(occupations)} chamad${
          isFem ? 'a' : 'o'
        } ${getRandomFrom(names)} ${getRandomFrom(
          parts.likesHates
        )} ${getRandomFrom(parts.likesHatesAction)}`,

        // exemplo: Ontem, Natália estava comendo fast food
        `${getRandomFrom(parts.pastTime)}, ${getRandomFrom(
          names
        )} estava ${getRandomFrom(parts.actionsTwo)}`
      ];

      const text = getRandomFrom(formats);
      const shownText = text.split('').join('‎');

      return {
        initialMessage: `digite essa frase no chat: \`${shownText}\`.`,
        additional: '',
        filter: (message) =>
          message.content.toLowerCase().startsWith(text.toLowerCase()),
        deleteFilter: (message) =>
          message.content
            .toLowerCase()
            .startsWith(text.toLowerCase().slice(0, 3)) ||
          message.content === shownText,
        amount: config.events.winPoints[1],
        appendToFinalMessage: async (initialMessage) => {
          const failedMessages = (
            await initialMessage.channel.messages.fetch({
              after: initialMessage.id
            })
          ).filter((m) => m.content.includes(shownText));
          const failedUsers = removeDuplicatesBy(
            (u) => u.id,
            failedMessages.map((m) => m.author)
          );
          return failedMessages.size > 0
            ? `\n\n⚠ atenção para ${failedUsers.join(
                ', '
              )}: copiar não funciona.`
            : '';
        }
      };
    })
  }
  // TODO: resto dos eventos
};

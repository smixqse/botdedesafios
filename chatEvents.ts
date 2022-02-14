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
import { channelTracking, points } from '.';
import config from './config';
import {
  getRandomFrom,
  getRandomNumberBetween,
  removeDuplicates,
  removeDuplicatesBy,
  wait
} from './utils';

type ChallengeType = 'normal' | 'rare';
type AwaitMessagesResponse = Collection<Snowflake, Message>;
type ChatChallenge = (
  challengeName: string,
  channel: TextChannel,
  author: GuildMember,
  challengeEnd: typeof challengeEndFunction
) => void;

export type Intervention =
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
  time = config.challenges.time,
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

  return channelTracking.get(channel.id)?.nextIntervention || null;
};

const givePoints = (winners: GuildMember[], amount: number) => {
  for (const winner of winners) {
    points.ensure(winner.id, { points: 0 });
    points.math(winner.id, '+', amount, 'points');
  }
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

const deleteChallengeTries = (
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
  challengeName: ChallengeName,
  winners: GuildMember[],
  amount: number
) => {
  const won = winners.length > 0;
  const list: string[] = [
    ...challenges[challengeName].messages[won ? 'won' : 'lost']
  ];
  const selectedMessage = getRandomFrom(list);
  if (won) {
    return replaceResultMessage(selectedMessage, winners, amount);
  } else {
    return selectedMessage;
  }
};

const createEmbed = (message: string, type: ChallengeType) => {
  return new MessageEmbed()
    .setColor(config.challenges.colors[type] as ColorResolvable)
    .setDescription(`🎉 | ${message}`);
};

const challengeStartFunction = async (
  initialMessage: string,
  channel: TextChannel,
  challengeType: ChallengeType,
  amount: number
) => {
  return await channel.send({
    embeds: [
      createEmbed(`valendo ${amount} pontos, ${initialMessage}`, challengeType)
    ]
  });
};

const challengeEndFunction = (
  channel: TextChannel,
  message: string,
  additional: string,
  challengeName: ChallengeName,
  intervention: Intervention | null,
  winners: GuildMember[],
  amount = config.challenges.winPoints[0]
) => {
  const challengeType = challenges[challengeName].type as ChallengeType;
  const won = winners.length > 0;

  const defaultAction = () => {
    channel.send({
      embeds: [createEmbed(`${message} ${additional}`, challengeType)]
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
                config.challenges.interventionMessages.steal,
                intervention.creator.toString()
              )} ${additional}`,
              challengeType
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
          ? config.challenges.interventionMessages.betWin
          : config.challenges.interventionMessages.betLose
        : config.challenges.interventionMessages.betNoWinner;
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
            challengeType
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

export const startChallenge = (
  challengeName: ChallengeName,
  channel: TextChannel,
  author: GuildMember,
  challenge: ChatChallenge
) => challenge(challengeName, channel, author, challengeEndFunction);

const createMessageChallenge = (
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
    challengeName: ChallengeName,
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

    const challengeType = challenges[challengeName].type as ChallengeType;

    const startMessage = await challengeStartFunction(
      initialMessage,
      channel,
      challengeType,
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

        challengeEndFunction(
          channel,
          getMessage(challengeName, winners, amount) + toAppend,
          additional,
          challengeName,
          interventionChecker(channel),
          winners,
          amount
        );
      },
      async () => {
        const toAppend = appendToFinalMessage
          ? await appendToFinalMessage(startMessage)
          : '';

        challengeEndFunction(
          channel,
          getMessage(challengeName, [], amount) + toAppend,
          additional,
          challengeName,
          interventionChecker(channel),
          [],
          amount
        );
      },
      max,
      time,
      () => {
        if (deleteFilter)
          deleteChallengeTries(channel, startMessage, deleteFilter);
      }
    );
  };
};

interface Challenges {
  [key: string]: {
    type: ChallengeType;
    messages: {
      won: string[];
      lost: string[];
    };
    run: any;
  };
}

export type ChallengeName =
  | 'math'
  | 'luckyNumber'
  | 'alphabet'
  | 'fastType'
  | 'wait';

export const challenges: Challenges = {
  math: {
    type: 'normal',
    messages: {
      won: ['tá bom nas matemáticas, né? {0}.'],
      lost: ['ninguém soube calcular rápido o suficiente.']
    },
    run: createMessageChallenge(() => {
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
        amount: config.challenges.winPoints[1]
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
      challengeName: ChallengeName,
      channel: TextChannel,
      author: GuildMember
    ) => {
      const challengeType = challenges[challengeName].type as ChallengeType;
      const amount = config.challenges.winPoints[1];

      const theNumber = getRandomNumberBetween(1, 10);
      const startMessage = await challengeStartFunction(
        'digite no chat um número de 1 a 10! vamos sortear daqui a pouco.',
        channel,
        challengeType,
        amount
      );

      awaitMessages(
        channel,
        (message) =>
          !isNaN(Number(message.content)) &&
          Number(message.content) >= 1 &&
          Number(message.content) <= 10,
        (collection) => collection,
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
                  getRandomFrom(challenges.luckyNumber.messages.won),
                  winningMembers,
                  amount
                )
              : getRandomFrom(challenges.luckyNumber.messages.lost)) +
            ` o número era ${theNumber}.`;
          const additional =
            duplicates.length > 0
              ? `\n\n⚠ atenção, ${duplicates.join(
                  ', '
                )}: apenas o primeiro número enviado vale.`
              : '';

          challengeEndFunction(
            channel,
            messageToSend,
            additional,
            challengeName,
            interventionChecker(channel),
            winningMembers,
            amount
          );

          deleteChallengeTries(channel, startMessage, (message) => {
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
    run: createMessageChallenge(() => {
      const amounts = config.challenges.winPoints;
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
    run: createMessageChallenge(() => {
      const parts = config.challenges.fastTypeParts;
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
        amount: config.challenges.winPoints[1],
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
  },
  wait: {
    messages: {
      won: [
        'obrigado por ser paciente! {0}',
        'valeu por esperar! {0}',
        'que bom que você lembrou! {0}'
      ],
      lost: ['não foi dessa vez.', '']
    },
    type: 'rare',
    run: async (
      challengeName: ChallengeName,
      channel: TextChannel,
      author: GuildMember
    ) => {
      const challengeType = challenges[challengeName].type as ChallengeType;
      const amount = config.challenges.winPoints[2];

      const theNumber = getRandomNumberBetween(10, 400);
      const minutes = config.challenges.waitChallengeMinutes;
      const startMessage = await challengeStartFunction(
        `lembre deste número (\`${theNumber}\`). voltarei daqui a ${minutes} minutos.`,
        channel,
        challengeType,
        amount
      );

      setTimeout(() => startMessage.delete(), 15000);

      await wait(minutes * 60 * 1000);

      const actualStartMessage = await challengeStartFunction(
        `qual foi o número que mandei alguns minutos atrás?`,
        channel,
        challengeType,
        amount
      );

      const processCollection = (collection: AwaitMessagesResponse) => {
        const wonMembers = [collection.first()?.member as GuildMember] ?? [];

        challengeEndFunction(
          channel,
          collection.size > 0
            ? replaceResultMessage(
                getRandomFrom(challenges.luckyNumber.messages.won),
                wonMembers,
                amount
              )
            : getRandomFrom(challenges.luckyNumber.messages.lost),
          `o número era ${theNumber}.`,
          'wait',
          interventionChecker(channel),
          wonMembers
        );
      };

      awaitMessages(
        channel,
        (message) => Number(message.content) === theNumber,
        (collection) => processCollection(collection),
        (collection) => processCollection(collection),
        1,
        20000
      );
    }
  }
  // TODO: resto dos desafios
};

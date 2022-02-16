import { APIGuildMember } from 'discord-api-types';
import {
  ButtonInteraction,
  Collection,
  CollectorFilter,
  ColorResolvable,
  Guild,
  GuildMember,
  Message,
  MessageEmbed,
  SelectMenuInteraction,
  Snowflake,
  TextChannel
} from 'discord.js';
import { channelTracking, client, users } from '.';
import config from './config';
import {
  getRandomFrom,
  getRandomNumberBetween,
  promiseWait,
  removeDuplicates,
  removeDuplicatesBy
} from './utils';

type ChallengeType = 'normal' | 'rare';
type AwaitMessagesResponse = Collection<Snowflake, Message>;
type ChatChallenge = (
  challengeName: string,
  channel: TextChannel,
  author: GuildMember,
  challengeEnd: typeof challengeEndFunction
) => void;
interface ChatChallengeData {
  type: ChallengeType;
  messages: {
    won: string[];
    lost: string[];
  };
  run: ChatChallenge;
}
interface Challenges {
  [key: string]: ChatChallengeData;
}

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

  const guild = client.guilds.resolve(config.guildId) as Guild;

  const interventionFromDb = channelTracking.get(channel.id)?.nextIntervention;

  if (!interventionFromDb) return null;

  if (interventionFromDb.type === 'steal') {
    return {
      channel: client.channels.resolve(
        interventionFromDb.channel
      ) as TextChannel,
      type: interventionFromDb.type,
      creator: guild.members.resolve(interventionFromDb.creator) as GuildMember
    };
  } else if (interventionFromDb.type === 'bet') {
    return {
      channel: client.channels.resolve(
        interventionFromDb.channel
      ) as TextChannel,
      type: interventionFromDb.type,
      creator: guild.members.resolve(interventionFromDb.creator) as GuildMember,
      bet: guild.members.resolve(interventionFromDb.bet) as GuildMember
    };
  } else {
    return null;
  }
};

const givePoints = async (
  winners: (GuildMember | APIGuildMember)[],
  amount: number
) => {
  for (const winner of winners) {
    if (!winner) continue;
    if (winner instanceof GuildMember) {
      users.ensure(winner.user.id, { points: 0 });
      users.math(winner.user.id, '+', amount, 'points');
    } else if (winner !== null) {
      /* users.ensure(winner.user?.id, { points: 0 });
      users.math(winner.userId, '+', amount, 'points'); */
    }
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

const createChallengeEmbed = (message: string, type: ChallengeType) => {
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
      createChallengeEmbed(
        `valendo ${amount} pontos, ${initialMessage}`,
        challengeType
      )
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
      embeds: [createChallengeEmbed(`${message} ${additional}`, challengeType)]
    });

    givePoints(winners, amount);
  };

  const resetIntervention = (channel: TextChannel) => {
    channelTracking.set(channel.id, null, 'nextIntervention');
  };

  if (intervention) {
    if (intervention.type === 'steal') {
      if (won) {
        channel.send({
          embeds: [
            createChallengeEmbed(
              `${winners.join(', ')} ${wonWord(winners)}, ${replaceMessage(
                config.challenges.interventionMessages.steal,
                `<@${intervention.creator.id}>`
              )} ${additional}`,
              challengeType
            )
          ]
        });
        givePoints([intervention.creator], amount);
        resetIntervention(channel);
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
          createChallengeEmbed(
            `${winners.join(', ') || 'ninguém'} ${wonWord(
              winners
            )}, ${replaceMessage(
              toAppend,
              `<@${intervention.creator.id}>`
            )} ${additional}`,
            challengeType
          )
        ]
      });
      givePoints(winners, amount);
      givePoints([intervention.creator], giveToBetter);
      resetIntervention(channel);
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

// DESAFIOS

const math = {
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
} as ChatChallengeData;

const luckyNumber = {
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
} as ChatChallengeData;

const alphabet = {
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
    const theAlphabet = 'abcdefghijklmnopqrstuvwxyz';
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
          return removeRandomCharacterFrom(theAlphabet);
        case 'reverse':
          const reversed = theAlphabet.split('').reverse().join('');
          return removeRandomCharacterFrom(reversed);
        case 'shuffle':
          let toShuffle = theAlphabet;
          for (let i = 0; i < getRandomNumberBetween(5, 15); i++) {
            const first = getRandomFrom(toShuffle.split(''));
            const second = getRandomFrom(toShuffle.split(''));
            toShuffle = toShuffle.replace(second, first).replace(first, second);
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
} as ChatChallengeData;

const fastType = {
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
    const occupations = isFem ? parts.occupations.fem : parts.occupations.masc;
    const formats = [
      // exemplo: Renata me disse que viajou para outro país
      `${getRandomFrom(names)} ${getRandomFrom(parts.said)} ${getRandomFrom(
        parts.actionsOne
      )}`,

      // exemplo: Um professor chamado Ricardo odeia dormir
      `${getRandomFrom(occupations)} chamad${isFem ? 'a' : 'o'} ${getRandomFrom(
        names
      )} ${getRandomFrom(parts.likesHates)} ${getRandomFrom(
        parts.likesHatesAction
      )}`,

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
          ? `\n\n⚠ atenção para ${failedUsers.join(', ')}: copiar não funciona.`
          : '';
      }
    };
  })
} as ChatChallengeData;

const wait = {
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

    await promiseWait(minutes * 60 * 1000);

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
} as ChatChallengeData;

const intervene = {
  type: 'rare',
  messages: {
    won: [''],
    lost: ['']
  },
  run: async (challengeName: ChallengeName, channel: TextChannel) => {
    const intervPoints = {
      steal: config.challenges.winPoints[1],
      bet: config.challenges.winPoints[2],
      removeChallenge: config.challenges.winPoints[1],
      fakeChallenge: config.challenges.winPoints[2] * 5,
      createChallenge: config.challenges.winPoints[2] * 7
    };

    const guild = (await client.guilds.fetch(config.guildId)) as Guild;

    const chooseMessage = await channel.send({
      components: [
        {
          type: 'ACTION_ROW',
          components: [
            {
              type: 'BUTTON',
              label: 'clique rápido para tentar ser escolhido!',
              customId: 'click',
              style: 'SUCCESS'
            }
          ]
        }
      ],
      embeds: [
        createChallengeEmbed(
          'o primeiro que clicar no botão ganhará direito a uma intervenção!',
          'rare'
        ).setFooter({ text: 'se der erro, você não foi rápido o suficiente.' })
      ]
    });

    chooseMessage
      .awaitMessageComponent({ componentType: 'BUTTON', time: 5000 })
      .then(async (interaction) => {
        const user = interaction.user;
        const member = interaction.member as GuildMember;
        const userPoints = users.ensure(user.id, { points: 0 }).points;

        await interaction.update({
          embeds: [
            createChallengeEmbed(
              'alguém já garantiu o poder de intervenção!',
              'rare'
            )
          ],
          components: [
            {
              type: 'ACTION_ROW',
              components: [
                {
                  type: 'BUTTON',
                  label: 'clique rápido para tentar ser escolhido!',
                  customId: 'click',
                  style: 'SUCCESS',
                  disabled: true
                }
              ]
            }
          ]
        });

        const optionsMessage = (await interaction.followUp({
          ephemeral: true,
          embeds: [
            new MessageEmbed()
              .setColor(config.color as ColorResolvable)
              .setTitle('você ganhou o poder de fazer uma intervenção!')
              .setDescription(
                `escolha como você usará seu poder. ${
                  userPoints < intervPoints.createChallenge
                    ? 'você pode não ter pontos suficientes para algumas das intervenções.'
                    : ''
                }`
              )
              .addFields([
                {
                  name: '1️⃣ Roubar',
                  value: `roubar pontos do ganhador do próximo desafio em ${channel}, mas se ninguém ganhar, você perde ${intervPoints.steal} pontos.`
                },
                {
                  name: '2️⃣ Apostar',
                  value: `apostar ${intervPoints.bet} pontos que alguém que mandou mensagem recentemente ganhará o próximo desafio em ${channel}. se ganhar, recebe o dobro. se perder, perde o que apostou.`
                },
                {
                  name: '3️⃣ Retirar o próximo desafio',
                  value: `custando ${intervPoints.removeChallenge} pontos, estrague a brincadeira retirando anonimamente o próximo desafio em ${channel}.`
                },
                {
                  name: '4️⃣ Mandar desafio falso',
                  value: `custando ${intervPoints.fakeChallenge} pontos, enganar os membros do servidor com um desafio falso em ${channel}. sua pegadinha será revelada 15 segundos depois.`
                },
                {
                  name: '5️⃣ Criar seu próprio desafio',
                  value: `custando ${intervPoints.createChallenge} pontos, criar seu próprio desafio em ${channel} valendo ${config.challenges.winPoints[2]} pontos.`
                }
              ])
              .setFooter({
                text: 'decida rápido! você só tem 30 segundos para isso.'
              })
          ],
          components: [
            {
              type: 'ACTION_ROW',
              components: [
                {
                  type: 'BUTTON',
                  label: '1',
                  customId: 'one',
                  style: 'PRIMARY',
                  disabled: intervPoints.steal > userPoints
                },
                {
                  type: 'BUTTON',
                  label: '2',
                  customId: 'two',
                  style: 'PRIMARY',
                  disabled: intervPoints.bet > userPoints
                },
                {
                  type: 'BUTTON',
                  label: '3',
                  customId: 'three',
                  style: 'PRIMARY',
                  disabled: intervPoints.removeChallenge > userPoints
                },
                {
                  type: 'BUTTON',
                  label: '4',
                  customId: 'four',
                  style: 'PRIMARY',
                  disabled: intervPoints.fakeChallenge > userPoints
                },
                {
                  type: 'BUTTON',
                  label: '5',
                  customId: 'five',
                  style: 'PRIMARY',
                  disabled: intervPoints.createChallenge > userPoints
                }
              ]
            }
          ]
        })) as Message;

        const timeoutMessage = (
          componentInteraction: ButtonInteraction | SelectMenuInteraction
        ) =>
          componentInteraction.followUp({
            ephemeral: true,
            embeds: [createChallengeEmbed('demorou demais!', 'rare')],
            components: []
          });

        optionsMessage
          .awaitMessageComponent({ componentType: 'BUTTON', time: 30000 })
          .then(async (optionInteraction) => {
            const option = optionInteraction.customId;

            const doneUpdate = (
              interaction: ButtonInteraction | SelectMenuInteraction
            ) =>
              interaction.update({
                embeds: [createChallengeEmbed('feito.', 'rare')],
                components: []
              });

            if (option === 'one') {
              channelTracking.set(
                channel.id,
                { type: 'steal', creator: member?.id, channel },
                'nextIntervention'
              );
              doneUpdate(optionInteraction);
            } else if (option === 'two') {
              const recentUsers = removeDuplicatesBy(
                (a) => a.id,
                (await channel.messages.fetch({ limit: 40 }))
                  .map((a) => a.author)
                  .filter((a) => !a.bot /*  && a.id !== user.id */)
              );
              optionInteraction
                .update({
                  embeds: [
                    createChallengeEmbed(
                      'em qual pessoa você quer apostar?',
                      'rare'
                    )
                  ],
                  components: [
                    {
                      type: 'ACTION_ROW',
                      components: [
                        {
                          type: 'SELECT_MENU',
                          label: 'pessoa',
                          customId: 'person',
                          maxValues: 1,
                          minValues: 1,
                          options: recentUsers.map((a) => ({
                            label: a.tag,
                            value: a.id,
                            emoji: '👤'
                          }))
                        }
                      ]
                    }
                  ]
                })
                .catch(() => optionInteraction.update('deu ruim'));
              (optionInteraction.message as Message)
                .awaitMessageComponent({
                  componentType: 'SELECT_MENU',
                  time: 30000
                })
                .then(async (userToBetInteraction) => {
                  channelTracking.set(
                    channel.id,
                    {
                      type: 'bet',
                      channel,
                      creator: guild.members.resolve(optionInteraction.user)
                        ?.id,
                      bet: guild.members.resolve(userToBetInteraction.values[0])
                        ?.id
                    },
                    'nextIntervention'
                  );
                  userToBetInteraction.update({
                    embeds: [
                      createChallengeEmbed(
                        `você apostou em <@${userToBetInteraction.values[0]}>.`,
                        'rare'
                      )
                    ],
                    components: []
                  });
                })
                .catch(() => timeoutMessage(optionInteraction));
            } else if (option === 'three') {
              doneUpdate(optionInteraction);
              channelTracking.set(
                channel.id,
                { type: 'remove', creator: member?.id, channel },
                'nextIntervention'
              );
              givePoints([member], -intervPoints.removeChallenge);
            } else if (option === 'four') {
              await optionInteraction.update({
                embeds: [
                  createChallengeEmbed(
                    'digite o texto do seu desafio falso e depois de 10 segundos seu desafio vai aparecer.',
                    'rare'
                  ).setFooter({
                    text: 'o bot apagará a mensagem na mesma hora, mas você pode evitar que vejam antes da hora ao digitar ||em spoiler||.'
                  })
                ],
                components: []
              });
              channel
                .awaitMessages({
                  filter: (a) => a.author.id === user.id,
                  max: 1,
                  errors: ['time'],
                  time: 30000
                })
                .then((collection) => {
                  const challengeTextMessage =
                    collection.first() as Message<boolean>;
                  challengeTextMessage.delete();
                  /* followUp.edit({
                    embeds: [
                      createChallengeEmbed(
                        `feito. ${challengeText.content}`,
                        'rare'
                      )
                    ]
                  }); */
                  //doneUpdate(optionInteraction);
                  channelTracking.set(
                    channel.id,
                    { type: 'fake', creator: member?.id, channel },
                    'nextIntervention'
                  );
                  givePoints([member], -intervPoints.fakeChallenge);
                  setTimeout(() => {
                    channel.send({
                      embeds: [
                        createChallengeEmbed(
                          challengeTextMessage.content
                            .replace('||', '')
                            .replace('||', ''),
                          'normal'
                        )
                      ]
                    });

                    setTimeout(() => {
                      channel.send({
                        embeds: [
                          createChallengeEmbed(
                            `o desafio era falso, e foi colocado por ${user}. te enganou?`,
                            'rare'
                          )
                        ]
                      });
                    }, 15000);
                  }, 10000);
                })
                .catch(() => {
                  optionInteraction.followUp({
                    embeds: [createChallengeEmbed('demorou demais!', 'rare')]
                  });
                });
            }
          })
          .catch(() => timeoutMessage(interaction));
      })
      .catch((e) => {
        console.log(e);
        chooseMessage.delete();
        channel.send({
          embeds: [
            createChallengeEmbed(
              'mas vocês não querem ter poder? demoraram demais!',
              'rare'
            )
          ]
        });
      });
  }
} as ChatChallengeData;

export type ChallengeName =
  | 'math'
  | 'luckyNumber'
  | 'alphabet'
  | 'fastType'
  | 'wait'
  | 'intervene';

export const challenges = {
  math,
  luckyNumber,
  alphabet,
  fastType,
  wait,
  intervene
  // TODO: resto dos desafios
} as Challenges;

const fastTypeParts = {
  occupations: {
    masc: [
      'um empresário',
      'um veterinário',
      'um gamer',
      'um pastor',
      'um fazendeiro',
      'um médico',
      'um enfermeiro',
      'um preguiçoso',
      'um homem comum',
      'um cachorro',
      'um gato',
      'um artista'
    ],
    fem: [
      'uma empresária',
      'uma veterinária',
      'uma gamer',
      'uma pastora',
      'uma fazendeira',
      'uma médica',
      'uma enfermeira',
      'uma preguiçosa',
      'uma mulher comum',
      'uma gata',
      'uma artista'
    ]
  },
  names: {
    masc: [
      'Roberto',
      'Rogério',
      'Cristiano',
      'Alexandre',
      'Lucas',
      'Leonardo',
      'Cebolinha',
      'Core',
      'Carlos',
      'Luciano',
      'Heitor',
      'Igor',
      'Pedro',
      'João',
      'Wesley',
      'Luan',
      'Hugo',
      'Enzo'
    ],
    fem: [
      'Roberta',
      'Renata',
      'Maria',
      'Ana',
      'Joana',
      'Letícia',
      'Emilly',
      'Helena',
      'Luciana',
      'Alice',
      'Íris',
      'Raíssa',
      'Yasmin',
      'Sabrina',
      'Tamara',
      'Úrsula',
      'Vanessa',
      'Bruna',
      'Natália',
      'Mariana',
      'Marília'
    ]
  },
  likesHates: ['gosta de', 'ama', 'odeia', 'não gosta de'],
  likesHatesAction: [
    'comer banana',
    'comer maçã',
    'comer manga',
    'beber café',
    'estudar',
    'criar coisas',
    'dormir',
    'dançar',
    'conversar',
    'cantar',
    'pensar',
    'inventar coisas',
    'ganhar presentes',
    'ser o centro das atenções',
    'fazer amizades'
  ],
  actionsOne: [
    'estava planejando ir para outra cidade',
    'dormiu no meio da aula',
    'comeu algo estragado',
    'discutiu com seu amigo',
    'almoçou algo bem gostoso',
    'correu pela calçada',
    'conversou com a professora',
    'viajou para outro país',
    'passou a noite estudando',
    'terminou de ler um livro',
    'formatou seu computador',
    'aprendeu algo interessante',
    'descobriu uma música nova',
    'comeu sua comida predileta'
  ],
  actionsTwo: [
    'comendo fast food',
    'correndo numa praça',
    'viajando com seus amigos',
    'editando um vídeo',
    'programando um jogo',
    'se divertindo',
    'cantando música em público',
    'fazendo compras',
    'tomando sorvete',
    'comendo num restaurante',
    'estudando matemática',
    'descansando',
    'lendo um livro',
    'pintando um quadro'
  ],
  said: ['me disse que', 'havia dito que', 'me falou que', 'me contou que'],
  pastTime: [
    'ontem',
    'anteontem',
    'na segunda',
    'na terça',
    'na quarta',
    'na quinta',
    'na sexta',
    'no sábado',
    'no domingo'
  ]
};

const color = '#d49234';

const config = {
  color,
  challenges: {
    enabled: true,
    channels: ['420382037124317184', '823619240569208855'],
    time: 15000,
    winPoints: [25, 50, 75],
    disabledEvents: [],
    colors: {
      normal: color,
      rare: '#9c229c'
    },
    interventionMessages: {
      steal: 'mas {0} roubou seus pontos. que pena!',
      betWin: 'e {0} ganhou o dobro por apostar em você!',
      betLose: 'mas {0} perdeu por ter apostado em outra pessoa.',
      betNoWinner: 'e {0} perdeu por ter apostado em alguém.'
    },
    fastTypeParts,
    waitChallengeMinutes: 2,
    messagesToWait: {
      min: 30,
      max: 200
    },
    rarity: 0.3
    // {0} = A ganhou X pontos, A e B ganharam X pontos, ninguém ganhou
    /*genericMessages: {
      won: ['boa! {0}.', 'aí sim! {0}.', 'que rapidez, hein? {0}.'],
      lost: [
        'que pena, ninguém ganhou...',
        'acabou o tempo! ninguém ganhou.',
        'demoraram demais, vocês têm que ser mais rápidos da próxima vez!'
      ]
    }*/
  },

  guildId: '420378219854823424',
  clientId: '420593871685156864',
  ownerId: '205319106608627722',
  statusMessages: [
    { text: 'jogos variados!', type: 'PLAYING' },
    { text: 'vocês perderem nos desafios!', type: 'WATCHING' },
    { text: 'vocês conversarem no chat 👀', type: 'WATCHING' }
  ],
  statusMessagesInterval: 60000 * 30
};

export default config;
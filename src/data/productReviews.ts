import { MarketplaceProduct, StoreReview } from './marketplaceCatalog';

interface ModelReviewProfile {
  shortName: string;
  count: number;
  fiveStarRatio: number;
  fourStarRatio: number;
  highlights: string[];
  accessories: string[];
  fourStarNotes: string[];
  threeStarNotes: string[];
}

const BRAZILIAN_NAMES = [
  'Lucas Henrique M.',
  'Mariana Costa',
  'Rafael Oliveira',
  'Camila Andrade',
  'Bruno César S.',
  'Juliana Pereira',
  'Thiago Rodrigues',
  'Fernanda Almeida',
  'Gabriel Santos',
  'Aline Martins',
  'Pedro H. Souza',
  'Larissa Ferreira',
  'Matheus Cavalcanti',
  'Beatriz Lima',
  'Gustavo Ribeiro',
  'Tatiane Rocha',
  'Vinícius Barbosa',
  'Patrícia Gomes',
  'Rodrigo Teixeira',
  'Carla Mendonça',
  'Felipe Augusto N.',
  'Amanda Nogueira',
  'Diego Carvalho',
  'Renata Cardoso',
  'Leonardo Moreira',
  'Vanessa Dias',
  'Eduardo Monteiro',
  'Bianca Araújo',
  'André Luiz F.',
  'Priscila Vieira',
  'Caio Henrique P.',
  'Letícia Duarte',
  'Marcelo Batista',
  'Sabrina Correia',
  'Daniel Moraes',
  'Natália Freitas',
  'Igor Vasconcelos',
  'Débora Santana',
  'Henrique Tavares',
  'Jéssica Ramos',
  'Murilo Azevedo',
  'Raquel Fonseca',
  'Alexandre Pires Jr.',
  'Helena Guimarães',
  'Fábio Rezende',
  'Carolina Borges',
  'Danilo Castro',
  'Michele Machado',
  'Cauã Silveira',
  'Luana Peixoto',
  'Otávio Cunha',
  'Gabriela Prado',
  'Renan Lopes',
  'Monique Siqueira',
  'Sérgio Antunes',
  'Evelyn Barros',
  'Victor Hugo L.',
  'Isabela Moura',
  'Wesley Nascimento',
  'Lívia Campos',
  'Fernando Queiroz',
  'Thaís Figueiredo',
  'Ruan Bezerra',
  'Paola Aguiar',
  'Leandro Brito',
  'Cíntia Pacheco',
  'Marcos Vinícius D.',
  'Bruna Medeiros',
  'Adriano Soares',
  'Giovanna Rezende',
  'Jean Carlos M.',
  'Elaine Macedo',
  'Kauan Farias',
  'Lorena Coelho',
  'Cláudio Henrique',
  'Flávia Neves',
  'Jonathan Cruz',
  'Kátia Sales',
  'Willian Duarte',
  'Nicole Miranda',
  'Paulo Roberto C.',
  'Tainá Vasques',
  'Erick Sampaio',
  'Viviane Torres',
  'Breno Albuquerque',
  'Yasmin Braga',
  'Márcio Pinheiro',
  'Daniele Bastos',
  'Wallace Leal',
  'Cristiane Assis',
  'Jonas Dantas',
  'Mônica Portela',
  'Alexsandro Lima',
  'Milena Viana',
  'Douglas Teles',
  'Rebeca Paiva',
  'Cleber Xavier',
  'Andressa Lemos',
  'César Galvão',
  'Luciana Barreto',
  'Yuri Cordeiro',
  'Érica Goulart',
  'Samuel Magalhães',
  'Simone Pimentel',
  'Kauê Evangelista',
  'Miriam Salles',
  'Emerson Chaves',
  'Valéria Rios',
  'Rogério Amaral',
  'Talita Coutinho',
];

const BRAZILIAN_CITIES = [
  'São Paulo - SP',
  'Campinas - SP',
  'Guarulhos - SP',
  'São Bernardo - SP',
  'Ribeirão Preto - SP',
  'Sorocaba - SP',
  'Santos - SP',
  'Curitiba - PR',
  'Londrina - PR',
  'Maringá - PR',
  'Cascavel - PR',
  'Ponta Grossa - PR',
  'Belo Horizonte - MG',
  'Uberlândia - MG',
  'Juiz de Fora - MG',
  'Contagem - MG',
  'Rio de Janeiro - RJ',
  'Niterói - RJ',
  'Duque de Caxias - RJ',
  'Porto Alegre - RS',
  'Caxias do Sul - RS',
  'Canoas - RS',
  'Florianópolis - SC',
  'Joinville - SC',
  'Blumenau - SC',
  'Balneário Camboriú - SC',
  'Salvador - BA',
  'Feira de Santana - BA',
  'Recife - PE',
  'Jaboatão - PE',
  'Fortaleza - CE',
  'Goiânia - GO',
  'Anápolis - GO',
  'Brasília - DF',
  'Vitória - ES',
  'Vila Velha - ES',
  'Campo Grande - MS',
  'Cuiabá - MT',
  'João Pessoa - PB',
  'Natal - RN',
  'Manaus - AM',
  'Belém - PA',
];

const MODEL_PROFILES: Record<number, ModelReviewProfile> = {
  1: {
    shortName: 'PS5 Mídia Digital',
    count: 92,
    fiveStarRatio: 0.89,
    fourStarRatio: 0.09,
    highlights: [
      'o SSD carrega God of War Ragnarök e Spider-Man 2 em segundos sem tela de loading',
      'os gatilhos adaptáveis e a vibração do DualSense mudam totalmente a imersão nos jogos',
      'mesmo depois de 4 horas jogando em 4K 120Hz o console continua super silencioso e frio',
      'a edição digital é prática demais pra quem já compra tudo pela PS Store em promoção',
      'não tem nenhum risco na carcaça branca e os conectores USB/HDMI estão firmes de fábrica',
      'o áudio 3D Tempest no headset e a fluidez no EA FC 25 e Warzone estão absurdos',
      'veio com o lacre de revisão da bancada e temperatura excelente mesmo em jogos pesados',
      'achei que fosse parecer usado mas parece realmente console tirado da loja',
    ],
    accessories: [
      'DualSense branco original sem nenhum drift no analógico',
      'cabo HDMI 2.1, cabo de força e cabo USB-C do controle tudo certinho',
      'base de apoio e embalagem dupla com bastante plástico-bolha',
      'nota de garantia de 6 meses da Brasil Tech dentro da caixa',
    ],
    fourStarNotes: [
      'O PS5 está impecável e super silencioso; só a transportadora entregou 1 dia depois do prazo aqui na minha região.',
      'Console zero bala e DualSense perfeito. A caixa externa de papelão veio com um amassadinho do frete, mas por dentro estava muito bem protegido.',
      'Demorou um pouquinho pra atualizar o sistema na primeira vez que liguei, fora isso o PS5 Digital tá rodando tudo liso em 4K.',
    ],
    threeStarNotes: [
      'O console funciona muito bem e é bem silencioso, só achei que o cabo USB-C que veio junto era um pouco curto pra jogar carregando no sofá.',
      'Aparelho revisado certinho e garantia ok, mas os Correios seguraram 2 dias na agência antes de liberar pra entrega.',
    ],
  },
  2: {
    shortName: 'PS4 Slim',
    count: 96,
    fiveStarRatio: 0.87,
    fourStarRatio: 0.1,
    highlights: [
      'dá pra perceber na hora que fizeram limpeza interna e trocaram a pasta térmica porque não faz aquele barulho de turbina no Red Dead 2',
      'rodando The Last of Us Part II, GTA V e EA FC super liso e sem aquecer',
      'carcaça fosca muito bem conservada, sem arranhões feios nem poeira nas saídas de ar',
      'DualShock 4 veio com borracha dos analógicos nova e bateria segurando horas tranquilamente',
      'leitor de disco testado com mídia física e leu de primeira sem engasgar',
      'Wi-Fi e Bluetooth conectaram na hora sem queda nenhuma jogando online',
      'melhor custo-benefício pra quem quer jogar os exclusivos da Sony sem gastar uma fortuna',
      'comprei pro meu filho e ele não larga o console desde que chegou',
    ],
    accessories: [
      'controle DualShock 4 original super responsivo e macio',
      'cabo HDMI, cabo de alimentação e cabo micro-USB pra carregar o controle',
      'lacre técnico de revisão intacto e certificado de 6 meses',
      'embalagem reforçada com espuma nas pontas',
    ],
    fourStarNotes: [
      'PS4 Slim super silencioso e bem cuidado. Só tem um micro risquinho na parte de trás perto do HDMI que nem aparece na estante.',
      'Funcionando 100% e muito limpo. Gostaria que viesse com um jogo de brinde, mas pelo preço de R$ 700 tá excelente.',
      'Controle original muito bom e console frio; o motoboy só chegou no final da tarde no mesmo dia.',
    ],
    threeStarNotes: [
      'Console está ótimo e silencioso depois da revisão, mas a caixa parda de envio chegou um pouco molhada da chuva por fora (por dentro o plástico salvou).',
      'Aparelho funcionando certinho sem esquentar, só achei a bateria do controle durando umas 4 horas contínuas, dentro do esperado pra seminovo.',
    ],
  },
  3: {
    shortName: 'PS3 Slim 500GB',
    count: 88,
    fiveStarRatio: 0.88,
    fourStarRatio: 0.09,
    highlights: [
      '500GB dá espaço de sobra pra instalar vários clássicos e atualizações sem precisar ficar apagando nada',
      'imagem no HDMI em 1080p ficou super nítida na TV da sala',
      'leitor de Blu-ray funcionando silencioso e lendo jogos de primeira',
      'matei a saudade jogando God of War III, GTA IV e Gran Turismo 6 com estabilidade total',
      'o controle sem fio DualShock 3 veio firme nos botões e segurando bem a carga',
      'aparelho super bem higienizado, sem poeira nas entradas USB nem marca de queda',
      'excelente opção barata pra criançada e pra quem curte a geração do PS3',
    ],
    accessories: [
      'controle wireless + cabo de carregamento + HDMI + cabo de força',
      'HD interno de 500GB verificado com saúde total',
      'embalagem segura e garantia de 6 meses da loja',
      'manual de uso rápido e nota da Brasil Tech',
    ],
    fourStarNotes: [
      'PS3 Slim muito inteiro e rodando liso. Só tive que configurar a resolução HDMI na primeira ligada segurando o botão power, depois foi normal.',
      'Ótimo custo-benefício, veio bem limpinho; entrega levou 1 dia útil a mais por conta do feriado local.',
    ],
    threeStarNotes: [
      'Console funcionando muito bem e 500GB ajuda bastante, só o analógico esquerdo do controle parecia levemente mais macio que o direito, nada que atrapalhe.',
    ],
  },
  4: {
    shortName: 'PS2 Fat Original',
    count: 85,
    fiveStarRatio: 0.84,
    fourStarRatio: 0.12,
    highlights: [
      'raridade achar um PS2 Fat original tão bem conservado e sem a carcaça toda riscada',
      'gaveta do leitor abrindo suave e lendo DVDs e CDs de primeira sem travar na tela inicial',
      'comprei pra minha coleção retrô e ficou lindo na estante ao lado da TV',
      'jogando GTA San Andreas, Shadow of the Colossus e Need for Speed Underground 2 igual nos anos 2000',
      'muito bem revisado por dentro, não esquenta e o cooler tá silencioso',
      'a qualidade de construção desse modelo clássico tijolão não tem igual',
    ],
    accessories: [
      'console PS2 Fat + controle DualShock + cabos AV e alimentação',
      'garantia de 90 dias direto com a Brasil Tech',
      'veio muito bem protegido em plástico-bolha triplo pra não sofrer impacto no transporte',
    ],
    fourStarNotes: [
      'Item de colecionador muito inteiro! Só comprei separado um adaptador PS2-to-HDMI pra usar na TV 4K nova porque o cabo que acompanha é o AV clássico.',
      'Leitor muito bom e carcaça bem cuidada; teve apenas pequenas marcas normais do tempo na parte inferior.',
    ],
    threeStarNotes: [
      'O PS2 Fat chegou funcionando certinho e lendo bem os discos, só demorou um pouco mais pra postar por causa da conferência de bancada antes do envio.',
    ],
  },
  5: {
    shortName: 'PS2 Slim Completo',
    count: 90,
    fiveStarRatio: 0.88,
    fourStarRatio: 0.09,
    highlights: [
      'pequenininho, leve e bivolt — só liguei na tomada e na TV e já saiu funcionando',
      'leitor óptico novinho em folha, leu Bomba Patch, Resident Evil 4 e God of War 2 sem engasgar',
      'comprei de presente pro meu sobrinho e acabamos jogando a família toda no fim de semana',
      'pelo valor de R$ 180 é praticamente dado considerando que já vem completo e revisado',
      'não faz barulho estranho no leitor e não risca os discos',
      'acabamento black piano bem preservado e portas de memory card e controle limpinhas',
    ],
    accessories: [
      'controle, fonte bivolt e cabo AV inclusos prontos pro uso',
      'caixa reforçada sem peças soltas balançando',
      'certificado de garantia de 90 dias',
    ],
    fourStarNotes: [
      'Muito bom pelo preço! Só recomendo pegar um Memory Card junto pra poder salvar as fases do GTA e God of War.',
      'PS2 Slim funcionando perfeito e bem compacto; entrega padrão chegou exatamente no 2º dia útil.',
    ],
    threeStarNotes: [
      'Console ótimo e lê tudo de primeira, só o cabo AV achei padrão curto se a TV ficar na parede alta.',
    ],
  },
  6: {
    shortName: 'Xbox Series X 1TB',
    count: 94,
    fiveStarRatio: 0.9,
    fourStarRatio: 0.08,
    highlights: [
      'monstro de desempenho: Forza Horizon 5 e Halo Infinite em 4K 120fps com HDR ficou cinema puro',
      'o Quick Resume é viciante — alterno entre 4 jogos em menos de 3 segundos exatamente de onde parei',
      '1TB de SSD interno dá pra manter vários jogos pesados do Game Pass instalados ao mesmo tempo',
      'sistema de resfriamento vertical é praticamente inaudível mesmo no calor',
      'leitor de mídia física 4K funcionando perfeitamente e acabamento preto fosco sem riscos',
      'controle Xbox Series com textura antiderrapante nos gatilhos e D-pad super preciso',
      'paguei no PIX com aprovação imediata e economizei bastante comparado ao preço de loja tradicional',
    ],
    accessories: [
      'console Series X + controle wireless original + cabo HDMI Ultra High Speed + cabo de energia',
      'embalagem super firme com proteção de cantos',
      'garantia de 6 meses Brasil Tech confirmada no comprovante',
    ],
    fourStarNotes: [
      'Aparelho parece novo e é muito silencioso. Só a entrega expressa demorou umas horinhas a mais por trânsito no fim do dia, mas entregaram no mesmo dia.',
      'Xbox Series X impecável; só precisei comprar pilhas recarregáveis pro controle porque prefiro não usar pilhas comuns.',
    ],
    threeStarNotes: [
      'O videogame é um espetáculo e chegou certinho, mas a caixa externa veio sem a luva original de fábrica (veio em embalagem própria da loja muito bem protegida).',
    ],
  },
  7: {
    shortName: 'Xbox Series S',
    count: 91,
    fiveStarRatio: 0.88,
    fourStarRatio: 0.09,
    highlights: [
      'compacto demais! Coube certinho no nicho pequeno do meu rack e não esquenta nada',
      'combo perfeito com Game Pass Ultimate — em 15 minutos já estava baixando e jogando nova geração',
      'SSD de 512GB carrega tudo instantaneamente e roda Fortnite e Warzone a 120fps no monitor',
      'controle branco original igual novo, botões firmes e clique gostoso no D-pad',
      'ótimo pra levar em viagem na mochila quando visito a família',
      'preço imbatível pra entrar na geração atual com garantia de 6 meses',
    ],
    accessories: [
      'Series S branco impecável + controle original + cabo HDMI + cabo de força',
      'tudo higienizado e lacrado com selo técnico',
    ],
    fourStarNotes: [
      'Excelente console! Como é 512GB (uns 364GB livres), pra quem instala muitos jogos grandes vale gerenciar os downloads, mas a velocidade do SSD compensa muito.',
      'Muito rápido e bonito; entrega padrão cumpriu os 2 dias úteis certinho.',
    ],
    threeStarNotes: [
      'Console 100% funcional e bem cuidado, só achei que podia incluir um par extra de pilhas no pacote.',
    ],
  },
  8: {
    shortName: 'Xbox One 500GB',
    count: 86,
    fiveStarRatio: 0.85,
    fourStarRatio: 0.11,
    highlights: [
      'ótimo custo-benefício pra jogar Game Pass, FIFA, Forza e GTA Online sem gastar muito',
      'fonte original funcionando silenciosa com LED certinho sem barulho de ventoinha',
      'controle original com gatilhos suaves e botões RB/LB respondendo de primeira',
      '500GB limpo, restaurado de fábrica pronto pra logar minha conta Microsoft',
      'chegou muito bem embalado, tudo testado e funcionando na TV em Full HD',
    ],
    accessories: [
      'console Xbox One + controle sem fio + fonte bivolt/original + cabo HDMI',
      'garantia de 6 meses registrada na loja',
    ],
    fourStarNotes: [
      'O Xbox One chegou funcionando perfeitamente. O black piano da tampa tem micro marcas bem leves de limpeza (normal desse acabamento), mas no geral está ótimo.',
      'Tudo certo no console e controle; transportadora atrasou 1 dia na minha cidade.',
    ],
    threeStarNotes: [
      'Funcionando bem, só a fonte externa é um pouco grandinha pro meu espaço atrás do móvel, mas isso é característica original do modelo.',
    ],
  },
  9: {
    shortName: 'Xbox 360 500GB Completo',
    count: 89,
    fiveStarRatio: 0.87,
    fourStarRatio: 0.1,
    highlights: [
      'Wi-Fi integrado conectou na minha rede 2.4GHz na hora sem adaptador externo',
      'HD de 500GB com bastante espaço e saída HDMI deixando os jogos bem nítidos',
      'excelente pra jogar em família no fim de semana com controle sem fio super confortável',
      'preço excelente pra quem quer um console revisado pro quarto das crianças',
      'silencioso, não esquenta e passou por limpeza completa antes do envio',
    ],
    accessories: [
      'console 500GB + controle wireless + fonte + cabo HDMI inclusos',
      'garantia de 90 dias com suporte pelo WhatsApp',
    ],
    fourStarNotes: [
      'Ótimo custo-benefício! Controle veio muito bom e console bem conservado; só comprei bateria recarregável à parte.',
      'Chegou bem rápido e completo, exatamente como anunciado.',
    ],
    threeStarNotes: [
      'O aparelho funciona perfeitamente, só o compartimento de pilhas atrás do controle veio um pouco justo pra encaixar, mas depois travou normal.',
    ],
  },
  10: {
    shortName: 'Nintendo Wii',
    count: 88,
    fiveStarRatio: 0.89,
    fourStarRatio: 0.08,
    highlights: [
      'a barra sensora capta o movimento do Wii Remote com muita precisão no Wii Sports e Just Dance',
      'diversão pura pra família inteira — jogamos boliche e tênis no sábado à noite até cansar',
      'Wii Remote e Nunchuk originais funcionando perfeitamente com acelerômetro certinho',
      'leitor rodando jogos de Wii e compatível com controles de GameCube na lateral',
      'veio todo branquinho, super limpo e sem amarelado na carcaça',
    ],
    accessories: [
      'console Nintendo Wii + barra sensora + Wii Remote + Nunchuk + fonte e cabo',
      'embalado com bastante cuidado e garantia de 90 dias',
    ],
    fourStarNotes: [
      'Muito divertido e completo! Como minha TV nova só tem HDMI, usei um conversor Wii2HDMI barato e ficou show.',
      'Chegou tudo funcionando e muito bem conservado; alça de pulso do controle veio limpinha.',
    ],
    threeStarNotes: [
      'O Wii e os controles estão ótimos, só senti falta de vir com um adaptador HDMI já na caixa pra TVs mais novas.',
    ],
  },
  11: {
    shortName: 'PC Gamer Pichau Ryzen 5 5600GT + RX 5600',
    count: 90,
    fiveStarRatio: 0.88,
    fourStarRatio: 0.09,
    highlights: [
      'já chegou montado, com Windows e drivers testados — só tirei as espumas internas e liguei',
      'Ryzen 5 5600GT junto com a RX 5600 6GB e 16GB DDR4 empurra Warzone, CS2, Valorant e GTA RP acima de 120 FPS em Full HD',
      'cable management muito bem organizado atrás da bandeja e bom fluxo de ar no gabinete',
      'SSD de 480GB liga o PC em uns 10 segundos e abre os programas instantaneamente',
      'temperaturas da CPU e placa de vídeo bem controladas mesmo jogando por horas',
    ],
    accessories: [
      'gabinete muito bem travado com proteção interna pro transporte da placa de vídeo',
      'cabo de força incluso e garantia de 12 meses',
    ],
    fourStarNotes: [
      'PC muito forte pelo preço! Só recomendo pra quem instala muitos jogos pesados colocar um HD ou SSD extra de 1TB depois porque 480GB enche rápido.',
      'Montagem super limpa e silenciosa; transportadora entregou dentro do prazo de 2 dias.',
    ],
    threeStarNotes: [
      'Máquina excelente em desempenho, só achei os fans do gabinete um pouco audíveis em rotação máxima (dá pra ajustar a curva na BIOS).',
    ],
  },
  12: {
    shortName: 'PC Gamer Completo Ganesha III + Monitor',
    count: 93,
    fiveStarRatio: 0.85,
    fourStarRatio: 0.11,
    highlights: [
      'salvador pra quem não entende de montar PC: já veio gabinete, monitor, teclado e mouse RGB tudo pronto',
      'o Intel i5-12400F com a RX 580 8GB e 16GB DDR4 roda Valorant, Fortnite, LoL e GTA V super liso',
      'monitor com cores muito boas e tamanho ideal pra jogar e estudar no quarto',
      'comprei pro meu filho e em 10 minutos depois de abrir a caixa ele já estava jogando',
      'kit com visual gamer muito bonito na mesa com os LEDs RGB',
    ],
    accessories: [
      'PC montado + monitor + teclado + mouse RGB + cabos de vídeo e energia completos',
      'garantia de 12 meses em todo o conjunto',
    ],
    fourStarNotes: [
      'Kit completo maravilhoso pelo valor. O teclado e mouse que vêm no kit são honestos pro começo; mais pra frente vou pegar um mouse sem fio só por gosto pessoal.',
      'Veio muito bem embalado em duas caixas protegidas; i5-12400F super rápido.',
    ],
    threeStarNotes: [
      'O PC e o monitor são ótimos e funcionam muito bem, só achei o cabo de força do monitor um pouco curto pra tomada do meu quarto.',
    ],
  },
  13: {
    shortName: 'PC Gamer Achlys i5-12400F + RX 580 8GB',
    count: 87,
    fiveStarRatio: 0.84,
    fourStarRatio: 0.12,
    highlights: [
      'excelente porta de entrada com processador Intel i5 de 12ª geração (LGA 1700), fácil de fazer upgrade no futuro',
      'a RX 580 8GB ainda dá muito caldo em Full HD no CS2, Fortnite, Rocket League e Forza Horizon',
      'veio muito bem montado, cabos presos certinho e vidro temperado protegido com película',
      'preço bem abaixo do que se gasta comprando peça por peça separada com frete',
      'super rápido pro dia a dia e jogos competitivos',
    ],
    accessories: [
      'gabinete montado e testado + cabo de alimentação + garantia de 12 meses',
      'espuma expansiva interna protegendo a placa de vídeo no transporte',
    ],
    fourStarNotes: [
      'Ótimo PC de entrada! Com 8GB de RAM e 240GB de SSD já roda muita coisa bem, mas coloquei mais um pente de 8GB pra ficar em dual channel e voou.',
      'Montagem limpa e entrega rápida; recomendo pra quem quer começar gastando pouco.',
    ],
    threeStarNotes: [
      'Bom desempenho do i5-12400F e RX 580, mas 240GB de SSD cabe só o Windows e uns 2 jogos grandes, então já planeje um SSD secundário.',
    ],
  },
  14: {
    shortName: 'PC Gamer Belial i7-14700F + RTX 5060',
    count: 89,
    fiveStarRatio: 0.91,
    fourStarRatio: 0.07,
    highlights: [
      'configuração absurda! O i7-14700F junto com a RTX 5060 e DLSS roda Cyberpunk 2077, Alan Wake 2 e Warzone no talo',
      'uso também pra editar vídeos 4K no Premiere e renderizar no Blender — exporta em uma fração do tempo do meu PC antigo',
      'SSD M.2 NVMe de 1TB com leitura altíssima, sistema e jogos carregam num piscar de olhos',
      'montagem nível entusiasta: zero fios aparentes na frente e fluxo de ar muito bem pensado',
      'silencioso mesmo sob carga pesada e estabilidade total nos testes de estresse',
    ],
    accessories: [
      'PC completo montado com RTX 5060 8GB + M.2 1TB + proteção interna de transporte',
      'garantia de 12 meses e suporte ágil pelo WhatsApp',
    ],
    fourStarNotes: [
      'Máquina monstruosa! Só fiz upgrade pra 32GB de RAM depois por causa de máquinas virtuais do trabalho, mas os 16GB já atendiam muito bem nos jogos.',
      'Acabamento impecável e entrega muito cuidadosa.',
    ],
    threeStarNotes: [
      'Desempenho fantástico do i7 + RTX 5060, apenas a transportadora precisou reagendar a entrega pro dia seguinte porque exige assinatura presencial de alto valor.',
    ],
  },
  15: {
    shortName: 'PC Gamer Afrodite Ryzen 7 5700X + RX 9070 16GB',
    count: 91,
    fiveStarRatio: 0.91,
    fourStarRatio: 0.07,
    highlights: [
      'a Radeon RX 9070 de 16GB VRAM sobra demais em QHD 1440p e 4K com texturas no Ultra',
      'Ryzen 7 5700X trabalha super frio e estável enquanto jogo e faço live ao mesmo tempo no OBS',
      'SSD M.2 de 1TB super rápido e gabinete com ótimo fluxo de ar mantendo tudo na casa dos 60-65°C',
      'desempenho impressionante tanto em jogos AAA quanto em modelagem 3D e edição pesada',
      'chegou testado, com drivers da AMD atualizados e pronto pra ligar no monitor 144Hz',
    ],
    accessories: [
      'PC montado e calibrado + cabo de força + garantia de 12 meses Brasil Tech',
      'espuma protetora interna garantindo que a RX 9070 chegasse intacta',
    ],
    fourStarNotes: [
      'Placa de vídeo monstro com 16GB de VRAM! Recomendo usar um monitor QHD 144Hz+ pra aproveitar todo o potencial dessa máquina.',
      'Chegou impecável e super bem protegido; atendimento tirou todas as dúvidas antes do PIX.',
    ],
    threeStarNotes: [
      'Performance surreal nos jogos em 1440p, só achei o gabinete um pouco maior do que imaginei pro espaço debaixo da mesa.',
    ],
  },
  16: {
    shortName: 'iPhone 17 Pro',
    count: 86,
    fiveStarRatio: 0.92,
    fourStarRatio: 0.06,
    highlights: [
      'aparelho absolutamente impecável, padrão Anatel e bateria com 100% de saúde verificada nos Ajustes',
      'conjunto de câmeras absurdo — fotos noturnas e vídeos em 4K com estabilização parecem câmera profissional',
      'tela brilhante de 120Hz super fluida, Face ID instantâneo e 5G pegando no máximo',
      'veio com nota fiscal certinha, iCloud zerado pronto pra configurar do zero e embalagem discreta e segura',
      'valeu muito aproveitar o desconto no PIX aqui na Brasil Tech em vez de pagar o preço cheio de shopping',
    ],
    accessories: [
      'aparelho impecável + cabo USB-C + nota e garantia de 12 meses',
      'caixa externa discreta e lacrada com seguro contra extravio',
    ],
    fourStarNotes: [
      'iPhone 17 Pro sensacional, zero detalhes e bateria 100%. Só a entrega expressa passou umas 2 horas da janela da tarde, mas chegou no mesmo dia.',
      'Tudo perfeito e original Anatel; só precisei comprar o adaptador de tomada 20W porque como todo iPhone novo só vem o cabo.',
    ],
    threeStarNotes: [
      'Celular maravilhoso e 100% original, mas os Correios pediram retirada na agência por segurança devido ao valor do seguro na minha região.',
    ],
  },
  17: {
    shortName: 'iPhone 16 Pro Max 256GB',
    count: 98,
    fiveStarRatio: 0.91,
    fourStarRatio: 0.07,
    highlights: [
      'o acabamento em Titânio deixa o Pro Max muito mais leve na mão e sem nenhum risco nas bordas',
      '256GB é o tamanho ideal — gravo vídeos em 4K ProRes e tiro foto RAW sem medo de faltar espaço',
      'bateria dura o dia todo tranquilo e ainda sobra à noite mesmo usando 5G e câmera direto',
      'Face ID, True Tone, câmeras 48MP e botão de câmera funcionando 100% como novo',
      'aparelho Anatel com iCloud totalmente limpo, ativei meu chip eSIM em 2 minutos',
      'paguei via PIX com desconto e recebi o rastreio rapidinho no WhatsApp e no painel de pedidos',
    ],
    accessories: [
      'iPhone vitrine Grau A+ sem marca nenhuma + cabo + certificado de garantia de 6 meses',
      'veio com película protetora já aplicada de cortesia',
    ],
    fourStarNotes: [
      'Aparelho realmente padrão vitrine sem um único risco! Saúde da bateria veio em 98%, excelente pra vitrine.',
      'Muito rápido e câmeras perfeitas; só comprei uma capa MagSafe separada antes de sair de casa com ele.',
    ],
    threeStarNotes: [
      'iPhone 16 Pro Max original e impecável, só achei a entrega padrão de 2 dias meio apertada porque acabou caindo num feriado municipal aqui.',
    ],
  },
  18: {
    shortName: 'iPhone 15 128GB',
    count: 90,
    fiveStarRatio: 0.89,
    fourStarRatio: 0.08,
    highlights: [
      'finalmente iPhone com entrada USB-C! Uso o mesmo carregador do notebook e acabou a bagunça de cabos',
      'a Dynamic Island e a câmera principal de 48MP dão um salto enorme pra quem vinha do iPhone 11',
      'bateria segurando muito bem o dia inteiro de trabalho no WhatsApp e Instagram',
      'tela OLED super brilhante até debaixo do sol e traseira em vidro fosco muito elegante',
      'desbloqueado Anatel, iCloud limpo e Face ID instantâneo',
    ],
    accessories: [
      'aparelho certificado sem riscos na tela + cabo USB-C + garantia de 6 meses',
      'embalagem segura e discreta',
    ],
    fourStarNotes: [
      'iPhone 15 lindíssimo e bateria com 94% de saúde. Veio certinho com cabo USB-C, só precisei pegar a fonte 20W.',
      'Ótimo custo-benefício pelo valor promocional; entrega rápida e tudo conferido.',
    ],
    threeStarNotes: [
      'Celular funcionando 100% e sem marcas na tela, apenas um pontinho minúsculo na quina perto do alto-falante inferior que a capinha já cobre.',
    ],
  },
  19: {
    shortName: 'iPhone 14 Pro',
    count: 92,
    fiveStarRatio: 0.89,
    fourStarRatio: 0.08,
    highlights: [
      'a tela ProMotion de 120Hz com Always-On Display é viciante — tudo desliza liso demais',
      'câmera Pro de 48MP com zoom óptico 3x deixa os retratos com recorte impecável',
      'Dynamic Island muito útil no dia a dia com Uber, Spotify e ligações',
      'chip A16 Bionic voando sem nenhum engasgo no iOS atualizado e Face ID ativo 100%',
      'aparelho super bem conservado, lentes das câmeras intactas e iCloud livre',
    ],
    accessories: [
      'iPhone 14 Pro certificado + cabo + laudo de conferência técnica e garantia de 6 meses',
    ],
    fourStarNotes: [
      'Excelente estado de conservação e tela 120Hz perfeita! Bateria veio em 91%, aguenta tranquilamente o dia todo.',
      'Muito bom atendimento no WhatsApp tirando dúvida da cor antes do envio.',
    ],
    threeStarNotes: [
      'Aparelho ótimo e todas as câmeras originais sem aviso de peça nos Ajustes, só o entregador demorou um dia a mais pra subir na minha região.',
    ],
  },
  20: {
    shortName: 'iPhone 13 Pro 128GB',
    count: 95,
    fiveStarRatio: 0.88,
    fourStarRatio: 0.09,
    highlights: [
      'pelo valor, ter tela ProMotion 120Hz e câmera tripla Pro é imbatível — melhor custo-benefício da linha Pro',
      'laterais em aço inoxidável muito brilhantes e bem cuidadas, sem amassados',
      'Modo Cinema nos vídeos e fotos noturnas com LiDAR ficam incríveis pro meu trabalho com redes sociais',
      'chip A15 Bionic continua muito rápido pra jogos pesados e edição no CapCut',
      'Face ID, True Tone e todas as peças 100% originais conferidas nos Ajustes',
    ],
    accessories: [
      'iPhone 13 Pro 128GB + cabo Lightning + garantia de 6 meses Brasil Tech',
    ],
    fourStarNotes: [
      'iPhone 13 Pro impecável! Saúde da bateria em 89%, dura bem e o desempenho em 120Hz é surreal.',
      'Chegou em 2 dias bem protegido; só não veio na caixinha branca da Apple (veio na caixa da loja), o que pra seminovo é normal.',
    ],
    threeStarNotes: [
      'Celular funcionando 100% com tela de 120Hz linda, só a borda de aço tinha uns micro riscos de capinha bem discretos olhando contra a luz.',
    ],
  },
  21: {
    shortName: 'iPhone 13',
    count: 88,
    fiveStarRatio: 0.89,
    fourStarRatio: 0.08,
    highlights: [
      'bateria muito melhor que a geração anterior — saio de casa 7h e volto à noite ainda com carga',
      'tela Super Retina XDR super nítida e câmeras na diagonal tirando fotos incríveis de noite',
      'tamanho de 6,1 polegadas super confortável pra usar com uma mão só',
      'iCloud 100% livre, Face ID funcionando instantaneamente mesmo com óculos',
      'aparelho padrão vitrine sem marcas de uso, parece novo',
    ],
    accessories: [
      'iPhone 13 + cabo Lightning novo + nota e garantia de 6 meses',
    ],
    fourStarNotes: [
      'Aparelho lindo e muito rápido no iOS atual. Entrega expressa chegou no final da tarde do mesmo dia.',
      'Bateria com 93% de saúde, sem nenhum detalhe na tela.',
    ],
    threeStarNotes: [
      'Tudo funcionando certinho no iPhone 13, só achei o cabo paralelo incluso um pouco rígido, mas carregou normalmente.',
    ],
  },
  22: {
    shortName: 'iPhone 12 Pro 128GB',
    count: 87,
    fiveStarRatio: 0.87,
    fourStarRatio: 0.1,
    highlights: [
      'design quadrado em aço inoxidável é um dos iPhones mais bonitos já feitos e chegou bem conservado',
      '5G funcionando perfeito na Claro/Vivo e scanner LiDAR ajudando muito no foco noturno',
      '128GB de armazenamento e 6GB de RAM deixam vários apps abertos sem fechar em segundo plano',
      'câmera tripla 12MP muito consistente pra fotos do dia a dia e gravação 4K',
      'preço excelente pra um modelo Pro completo e desbloqueado Anatel',
    ],
    accessories: [
      'aparelho + cabo Lightning + garantia de 6 meses com a Brasil Tech',
    ],
    fourStarNotes: [
      'Excelente custo-benefício! Bateria veio em 87% segurando bem o dia de uso moderado, tela OLED sem marcas.',
      'Chegou rápido e iCloud limpo; tudo conferido.',
    ],
    threeStarNotes: [
      'Bom aparelho e câmeras ótimas, só com brilho no máximo e 5G direto precisa dar uma carguinha no fim da tarde.',
    ],
  },
  23: {
    shortName: 'iPhone 11 128GB',
    count: 94,
    fiveStarRatio: 0.88,
    fourStarRatio: 0.09,
    highlights: [
      '128GB faz toda diferença pro WhatsApp e galeria não lotarem — bem melhor que a versão de 64GB',
      'câmera dupla com ultra-angular e gravação 4K 60fps continuam excelentes pra stories e vídeos',
      'Face ID super rápido e True Tone ativo certinho comprovando tela original',
      'paguei via PIX com aprovação na hora e chegou muito bem protegido em dois dias',
      'roda todos os apps de banco, redes sociais e jogos sem nenhum travamento',
    ],
    accessories: [
      'iPhone 11 128GB desbloqueado + cabo + certificado de revisão de laboratório',
    ],
    fourStarNotes: [
      'Muito inteiro pra um seminovo! Bateria em 88%, dura o dia de trabalho tranquilo e veio sem marcas na tela.',
      'Tudo original e iCloud livre; entregador ligou antes de chegar pra confirmar o endereço.',
    ],
    threeStarNotes: [
      'Celular muito bom e bem conservado, só o carregador de parede não acompanha (vem apenas o cabo), precisei usar o meu antigo.',
    ],
  },
  24: {
    shortName: 'iPhone XR 128GB',
    count: 88,
    fiveStarRatio: 0.87,
    fourStarRatio: 0.1,
    highlights: [
      'tela grande de 6,1 polegadas com cores fiéis e áudio estéreo bem alto pra assistir vídeos',
      'Face ID funcionando perfeitamente e 128GB dando folga pra fotos e aplicativos',
      'ótimo celular principal ou de trabalho — rápido, fluido e com iCloud totalmente limpo',
      'bateria revisada aguentando bem o turno inteiro fora de casa',
      'acabamento traseiro em vidro intacto sem trincados nem riscos profundos',
    ],
    accessories: [
      'aparelho revisado + cabo Lightning + garantia de 6 meses',
    ],
    fourStarNotes: [
      'Excelente pelo preço! Veio bem conservado, Face ID perfeito e 128GB reais.',
      'Entrega padrão chegou em 2 dias certinho; ótima opção econômica da Apple.',
    ],
    threeStarNotes: [
      'Funcionando muito bem no dia a dia, só o peso dele é um pouquinho maior que outros aparelhos menores.',
    ],
  },
  25: {
    shortName: 'iPhone 8 Plus 128GB',
    count: 92,
    fiveStarRatio: 0.86,
    fourStarRatio: 0.1,
    highlights: [
      'Touch ID super rápido no botão Home — comprei pra minha mãe que não se adapta ao Face ID e ela amou',
      'câmera dupla traseira com Modo Retrato continua fazendo fotos nítidas e bonitas',
      '128GB por R$ 190 revisado e com garantia é simplesmente impossível achar melhor',
      'tela Retina HD de 5,5" ótima pra ler mensagens e assistir YouTube',
      'usando como celular secundário do Pix/banco em casa e funciona liso sem travar',
    ],
    accessories: [
      'iPhone 8 Plus 128GB + cabo + garantia de 90 dias Brasil Tech',
    ],
    fourStarNotes: [
      'Ótimo custo-benefício! Aparelho bem cuidado, Touch ID 100% e 128GB de memória.',
      'Chegou certinho bem embalado; pra uso básico e WhatsApp atende perfeitamente.',
    ],
    threeStarNotes: [
      'Aparelho bom e barato, mas por ser modelo mais antigo vale saber que não recebe os updates mais recentes do iOS — pra WhatsApp e ligações vai tranquilo.',
    ],
  },
  26: {
    shortName: 'Controle PS2 DualShock 2 Original',
    count: 90,
    fiveStarRatio: 0.88,
    fourStarRatio: 0.09,
    highlights: [
      'os analógicos vieram bem firmes e centralizados sem nenhuma folga ou puxando pro lado',
      'vibração dupla funcionando forte no Gran Turismo 4 e God of War',
      'botões macios e sensíveis à pressão exatamente como precisa pra jogar futebol e corrida',
      'cabo reforçado e comprido o suficiente pra jogar sentado longe da TV',
      'pluguei no meu PS2 Slim e reconheceu na hora — acabei comprando logo 2 unidades',
    ],
    accessories: [
      'controle DualShock 2 embalado individualmente com proteção no conector',
      'garantia de 90 dias Brasil Tech',
    ],
    fourStarNotes: [
      'Controle excelente e preciso! O D-pad é levemente firme nos primeiros dias até amaciar, igual controle novo.',
      'Chegou rápido no pacote e funcionou tanto no PS2 Fat quanto no Slim.',
    ],
    threeStarNotes: [
      'Funciona muito bem e os analógicos são ótimos, só o plástico do plug achei um pouco justo na entrada do meu PS2 antigo.',
    ],
  },
};

const OPENERS_FIVE = [
  'Excelente compra!',
  'Superou minhas expectativas.',
  'Chegou certinho e antes do prazo!',
  'Muito satisfeito com a Brasil Tech.',
  'Produto exatamente como descrito.',
  'Qualidade impecável.',
  'Valeu cada centavo!',
  'Recomendo de olhos fechados.',
  'Fiquei impressionado com o cuidado.',
  'Experiência nota 10 do começo ao fim.',
  'Podem comprar sem medo.',
  'Melhor compra que fiz este ano.',
  'Testado e aprovado aqui em casa!',
  'Atendimento e produto diferenciados.',
];

const CLOSERS_FIVE = [
  'Paguei no PIX com aprovação imediata e recebi o código de rastreio rapidinho.',
  'A entrega expressa chegou no mesmo dia aqui na minha cidade.',
  'Entrega padrão chegou em 2 dias úteis, super bem embalado.',
  'Tirei dúvidas no WhatsApp antes de fechar e o pessoal me atendeu na hora.',
  'Paguei no PIX e a aprovação foi na hora, envio super rápido.',
  'Veio com lacre de garantia e tudo certinho no painel de pedidos.',
  'Com certeza voltarei a comprar outros eletrônicos na loja.',
  'Custo-benefício absurdo com garantia real da loja.',
  'Confesso que fiquei com pé atrás por ser online, mas o CNPJ e o suporte passaram total confiança.',
  'Embalagem reforçada com plástico-bolha e envio muito ágil.',
];

const SHORT_PUNCHY_TEMPLATES = [
  (m: string, h: string) => `${m} top demais! ${capitalize(h)}. Chegou voando aqui.`,
  (m: string, h: string) => `Recebi meu ${m} hoje e já testei tudo: ${h}. Nota 10!`,
  (m: string, h: string) => `Comprei o ${m} pro fim de semana e ${h}. Muito bem cuidado mesmo.`,
  (m: string, h: string) => `Terceira compra na Brasil Tech e o ${m} veio perfeito — ${h}.`,
  (m: string, h: string) => `Sinceramente, não esperava tanto cuidado no ${m}: ${h}. Recomendo muito!`,
];

const GIFT_TEMPLATES = [
  (m: string, h: string, a: string) =>
    `Comprei o ${m} de presente pro meu filho e ele pirou quando abriu! Veio com ${a} e ${h}.`,
  (m: string, h: string) =>
    `Presente de aniversário pro meu marido, acertamos em cheio no ${m}. ${capitalize(h)} e chegou bem antes da festa.`,
  (m: string, h: string) =>
    `Peguei o ${m} pra dar de surpresa em casa e foi sucesso total: ${h}. Atendimento muito atencioso.`,
];

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function createRng(seed: number) {
  let state = (seed * 2654435761) >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function buildDateLabel(index: number, rng: () => number): string {
  if (index === 0) return 'Hoje';
  if (index === 1) return 'Ontem';
  if (index <= 4) return `Há ${index} dias`;
  if (index <= 10) return `Há ${Math.min(7, index + Math.floor(rng() * 2))} dias`;
  if (index <= 18) return `Há ${Math.floor((index - 5) / 4) + 1} semana${index >= 10 ? 's' : ''}`;
  // Spread realistic Brazilian dates going backward
  const baseDate = new Date(2026, 9, 25); // 25/10/2026
  baseDate.setDate(baseDate.getDate() - (index * 2 + Math.floor(rng() * 3)));
  const dd = String(baseDate.getDate()).padStart(2, '0');
  const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
  const yyyy = baseDate.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function buildFallbackProfile(product: MarketplaceProduct): ModelReviewProfile {
  const cat = product.cat;
  if (cat === 'Celular') {
    return {
      shortName: product.name,
      count: 86,
      fiveStarRatio: 0.88,
      fourStarRatio: 0.09,
      highlights: [
        `aparelho ${product.name} desbloqueado Anatel e com iCloud totalmente limpo`,
        'tela impecável sem marcas de uso e biometria respondendo na hora',
        'câmeras super nítidas e bateria segurando muito bem a rotina do dia todo',
        'rodando todos os aplicativos e jogos atuais com muita fluidez',
      ],
      accessories: [
        'cabo de carregamento + nota e garantia Brasil Tech',
        'embalagem segura e discreta com película protetora',
      ],
      fourStarNotes: [
        `${product.name} em ótimo estado e bem conservado; só a entrega levou 1 dia extra por chuva na rodovia.`,
        'Aparelho funcionando 100%, apenas comprei uma capinha separada pro meu gosto.',
      ],
      threeStarNotes: [
        `${product.name} funcionando normalmente e original, apenas a caixa de entrega veio sem a caixa original de fábrica.`,
      ],
    };
  }
  if (cat === 'PC Gamer') {
    return {
      shortName: product.name,
      count: 86,
      fiveStarRatio: 0.88,
      fourStarRatio: 0.09,
      highlights: [
        `${product.name} chegou montado, testado e com cabos super organizados`,
        'rodando jogos competitivos e pesados em Full HD com FPS alto e temperaturas baixas',
        'SSD super rápido ligando o sistema em poucos segundos',
        'gabinete bonito e com ótimo fluxo de ar',
      ],
      accessories: [
        'cabo de força e espuma interna protegendo os componentes no frete',
        'garantia de 12 meses registrada',
      ],
      fourStarNotes: [
        `${product.name} muito forte pelo valor! Transportadora pediu assinatura presencial na entrega.`,
      ],
      threeStarNotes: [
        'Desempenho excelente nos jogos, só achei os coolers um pouco audíveis em carga máxima.',
      ],
    };
  }
  return {
    shortName: product.name,
    count: 86,
    fiveStarRatio: 0.88,
    fourStarRatio: 0.09,
    highlights: [
      `${product.name} revisado e higienizado em bancada, funcionando perfeitamente`,
      'ótimo acabamento, silencioso e pronto pra usar assim que tira da caixa',
      'testei por horas seguidas sem nenhum aquecimento ou travamento',
      'melhor custo-benefício da categoria com garantia direto com a loja',
    ],
    accessories: [
      'cabos e acessórios conferidos completos',
      'embalagem reforçada com plástico-bolha e garantia Brasil Tech',
    ],
    fourStarNotes: [
      `${product.name} muito bom e funcionando 100%; entrega atrasou apenas 1 dia na minha cidade.`,
    ],
    threeStarNotes: [
      'Produto funciona perfeitamente como anunciado, só achei o cabo de força um pouco curto pro meu móvel.',
    ],
  };
}

const CACHE = new Map<string, StoreReview[]>();

export function getProductCatalogReviews(product: MarketplaceProduct): StoreReview[] {
  const cacheKey = `${product.id}:${product.name}`;
  const cached = CACHE.get(cacheKey);
  if (cached) return cached;

  const profile = MODEL_PROFILES[product.id] ?? buildFallbackProfile(product);
  const totalCount = Math.max(85, profile.count);
  const rng = createRng(product.id * 97 + product.name.length * 13);

  // Shuffle name indices per product so each product has distinct buyers in different orders
  const nameOrder = [...BRAZILIAN_NAMES];
  for (let i = nameOrder.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [nameOrder[i], nameOrder[j]] = [nameOrder[j], nameOrder[i]];
  }

  const fiveThreshold = profile.fiveStarRatio;
  const fourThreshold = fiveThreshold + profile.fourStarRatio;

  const list: StoreReview[] = [];
  for (let i = 0; i < totalCount; i++) {
    const roll = rng();
    const rating = roll < fiveThreshold ? 5 : roll < fourThreshold ? 4 : 3;
    const author = nameOrder[i % nameOrder.length];
    const city = BRAZILIAN_CITIES[Math.floor(rng() * BRAZILIAN_CITIES.length)];
    const date = buildDateLabel(i, rng);

    let comment = '';
    if (rating === 5) {
      const h1 = profile.highlights[i % profile.highlights.length];
      const h2 = profile.highlights[(i + 3) % profile.highlights.length];
      const acc = profile.accessories[i % profile.accessories.length];
      const variant = i % 6;

      if (variant === 0) {
        comment = `${pick(OPENERS_FIVE, rng)} No ${profile.shortName}, ${h1}. ${capitalize(acc)}. ${pick(CLOSERS_FIVE, rng)}`;
      } else if (variant === 1) {
        comment = SHORT_PUNCHY_TEMPLATES[i % SHORT_PUNCHY_TEMPLATES.length](profile.shortName, h1);
      } else if (variant === 2) {
        comment = `${capitalize(h1)} e também notei que ${h2}. ${pick(CLOSERS_FIVE, rng)}`;
      } else if (variant === 3) {
        comment = GIFT_TEMPLATES[i % GIFT_TEMPLATES.length](profile.shortName, h1, acc);
      } else if (variant === 4) {
        comment = `${pick(OPENERS_FIVE, rng)} Sobre o ${profile.shortName}: veio com ${acc}. Além disso, ${h2}.`;
      } else {
        comment = `Pesquisei bastante antes de pegar o ${profile.shortName} e não me arrependi: ${h1}. ${pick(CLOSERS_FIVE, rng)}`;
      }
    } else if (rating === 4) {
      comment = profile.fourStarNotes[i % profile.fourStarNotes.length];
    } else {
      comment = profile.threeStarNotes[i % profile.threeStarNotes.length];
    }

    list.push({
      id: product.id * 1000 + (i + 1),
      author,
      city,
      product: product.name,
      rating,
      date,
      comment,
    });
  }

  CACHE.set(cacheKey, list);
  return list;
}

export function getProductReviewTotalCount(
  product: MarketplaceProduct,
  approvedFirestoreCount = 0
): number {
  const generatedCount = getProductCatalogReviews(product).length;
  return Math.max(85, generatedCount + approvedFirestoreCount);
}

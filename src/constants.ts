import { Sentence } from './types';

export const STARTER_SENTENCES: Sentence[] = [
  {
    id: '1',
    vn: 'Xin chào, bạn khỏe không?',
    en: 'Hello, how are you?',
    pronunciation: 'Sin chàow, bạhn kwẻa kohm?',
    en_pronunciation: 'heh-LOH, how ARR yoo?',
    literal_translation: [
      { word: 'Xin chào', translation: 'hello' },
      { word: 'bạn', translation: 'you' },
      { word: 'khỏe', translation: 'healthy' },
      { word: 'không', translation: 'no/question' }
    ],
    difficulty: 1,
    category: 'common',
  },
  {
    id: '2',
    vn: 'Tôi muốn một ly cà phê sữa đá.',
    en: 'I want a glass of iced coffee with milk.',
    pronunciation: 'Toy muốhn mộht lee càh feh sữ-a đáh.',
    en_pronunciation: 'ai WAHNT uh glass uv IST KAW-fee with milk.',
    literal_translation: [
      { word: 'Tôi', translation: 'I' },
      { word: 'muốn', translation: 'want' },
      { word: 'một', translation: 'one' },
      { word: 'ly', translation: 'glass' },
      { word: 'cà phê', translation: 'coffee' },
      { word: 'sữa', translation: 'milk' },
      { word: 'đá', translation: 'ice' }
    ],
    difficulty: 2,
    category: 'common',
  },
  {
    id: '3',
    vn: 'Hôm nay trời rất đẹp.',
    en: "The weather is very beautiful today.",
    pronunciation: 'Hohm nai trờy rấht đẹhp.',
    en_pronunciation: 'thuh WEH-thur iz VEH-ree BYOO-tih-ful too-DAY.',
    literal_translation: [
      { word: 'Hôm nay', translation: 'today' },
      { word: 'trời', translation: 'sky/weather' },
      { word: 'rất', translation: 'very' },
      { word: 'đẹp', translation: 'beautiful' }
    ],
    difficulty: 1,
    category: 'vocabulary',
  },
  {
    id: '4',
    vn: 'Bạn tên là gì?',
    en: 'What is your name?',
    pronunciation: 'Bạhn tehn làh zèe?',
    en_pronunciation: 'WUT iz yor NAYM?',
    literal_translation: [
      { word: 'Bạn', translation: 'friend/you' },
      { word: 'tên', translation: 'name' },
      { word: 'là', translation: 'is' },
      { word: 'gì', translation: 'what' }
    ],
    difficulty: 1,
    category: 'common',
  },
  {
    id: '5',
    vn: 'Tôi đang học tiếng Việt.',
    en: 'I am learning Vietnamese.',
    pronunciation: 'Toy đahng họck tyeéng Vyệht.',
    en_pronunciation: 'ai am LUR-ning vee-et-nuh-MEEZ.',
    literal_translation: [
      { word: 'Tôi', translation: 'I' },
      { word: 'đang', translation: 'currently (action)' },
      { word: 'học', translation: 'learning' },
      { word: 'tiếng', translation: 'language' },
      { word: 'Việt', translation: 'Vietnamese' }
    ],
    difficulty: 2,
    category: 'grammar',
  },
  {
    id: '6',
    vn: 'Cảm ơn vì sự giúp đỡ của bạn.',
    en: 'Thank you for your help.',
    pronunciation: 'Kảm uhn vèe sự zyoóp đỗa củ-a bạhn.',
    en_pronunciation: 'THANK yoo for yor HELP.',
    literal_translation: [
      { word: 'Cảm ơn', translation: 'thank (you)' },
      { word: 'vì', translation: 'because/for' },
      { word: 'sự giúp đỡ', translation: 'help' },
      { word: 'của', translation: 'of/belonging to' },
      { word: 'bạn', translation: 'you' }
    ],
    difficulty: 3,
    category: 'common',
  },
  {
    id: '7',
    vn: 'Nhà hàng này ở đâu?',
    en: 'Where is this restaurant?',
    pronunciation: 'Nhàh hàhng nàiy ở đow?',
    en_pronunciation: 'WAIR iz this RES-tuh-rahnt?',
    literal_translation: [
      { word: 'Nhà hàng', translation: 'restaurant' },
      { word: 'này', translation: 'this' },
      { word: 'ở', translation: 'at/in' },
      { word: 'đâu', translation: 'where' }
    ],
    difficulty: 2,
    category: 'vocabulary',
  },
  {
    id: '8',
    vn: 'Cái này giá bao nhiêu?',
    en: 'How much does this cost?',
    pronunciation: 'Kái nàiy záh bow nyew?',
    en_pronunciation: 'how MUCH duz this KAWST?',
    literal_translation: [
      { word: 'Cái này', translation: 'this thing' },
      { word: 'giá', translation: 'price' },
      { word: 'bao nhiêu', translation: 'how much' }
    ],
    difficulty: 2,
    category: 'common',
  },
  {
    id: '9',
    vn: 'Chúc ngủ ngon.',
    en: 'Good night.',
    pronunciation: 'Chúhk ngủ ngohn.',
    en_pronunciation: 'gud NITE.',
    literal_translation: [
      { word: 'Chúc', translation: 'wish' },
      { word: 'ngủ', translation: 'sleep' },
      { word: 'ngon', translation: 'delicious/well' }
    ],
    difficulty: 1,
    category: 'common',
  },
  {
    id: '10',
    vn: 'Tôi không hiểu.',
    en: 'I don\'t understand.',
    pronunciation: 'Toy kohm hiyểu.',
    en_pronunciation: 'ai DOHNT un-dur-STAND.',
    literal_translation: [
      { word: 'Tôi', translation: 'I' },
      { word: 'không', translation: 'not' },
      { word: 'hiểu', translation: 'understand' }
    ],
    difficulty: 1,
    category: 'common',
  }
];

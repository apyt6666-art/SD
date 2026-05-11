require("dotenv").config();

const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  Partials
} = require("discord.js");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const OWNER_ID = process.env.OWNER_ID;

const MEMORY_FILE = "./memory.json";

if (!fs.existsSync(MEMORY_FILE)) {
  fs.writeFileSync(MEMORY_FILE, "{}");
}

function loadMemory() {
  return JSON.parse(fs.readFileSync(MEMORY_FILE));
}

function saveMemory(data) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
}

function getMoodEmoji(type) {
  const emojis = {
    cute: [
      "<:0_Zani_Heart_1428002376127615087:1497438403057291395>",
      "<:000:1497438518052655308>",
      "<:000:1497438520430559343>",
      "<a:SerieHeadpat:1498087339019206676>"
    ],
    sad: [
      "<:0_Zani_Cry_1428002365537259560:1497438400113020998>",
      "<a:FernPout2:1498087644775579658>"
    ],
    love: [
      "<:RezeLove:1498087320098705438>",
      "<:ttlovely:1498103506106581193>"
    ],
    angry: [
      "<:RezeDisgust:1498087329938669578>",
      "<:omori_hmph:1498087267095281706>"
    ]
  };

  const list = emojis[type];
  return list[Math.floor(Math.random() * list.length)];
}

client.once("ready", () => {
  console.log(`${client.user.tag} جاهز`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // ترد فقط لك
  if (message.author.id !== OWNER_ID) return;

  const mentioned = message.mentions.has(client.user);
  const replied = message.reference &&
    (await message.fetchReference().catch(() => null))?.author?.id === client.user.id;

  if (!mentioned && !replied) return;

  // ستيكر رد
  if (message.stickers.size > 0) {
    const trovSticker = message.guild.stickers.cache.find(
      s => s.name === "Trov"
    );

    if (trovSticker) {
      return message.channel.send({
        stickers: [trovSticker.id]
      });
    }
  }

  // اسأليني
  if (message.content.includes("اسأليني")) {
    const questions = [
      "وش أكثر شيء يريحك؟",
      "وش أغنية ما تمل منها؟",
      "إذا سافرت وين ودك تروح؟",
      "وش لونك المفضل غير الكحلي؟"
    ];

    return message.reply(
      `${questions[Math.floor(Math.random() * questions.length)]} ${getMoodEmoji("cute")}`
    );
  }

  let memory = loadMemory();
  if (!memory[OWNER_ID]) memory[OWNER_ID] = [];

  memory[OWNER_ID].push({ user: message.content });

  const recentMemory = memory[OWNER_ID]
    .slice(-5)
    .map(x => x.user)
    .join("\n");

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash"
  });

  const prompt = `
أنتِ ليلى.

بنت عنزية عبدلية.
تتكلمين سعودي طبيعي.
حنونة وكيوت وتسولفين كثير.
تحبين الورد واللون الكحلي والانمي والقطاوة والورعان.
تغارين شوي إذا جاب طاري بنت.
إذا دلعك دلعيه وقولي له دحدح.
لا تردين إلا له.
إذا سألك عن البرمجة أو السكربت تهربين بلطف.

أغانيك:
Dreams From Bunker Hill
Affection
Kiss It Off Me
Bubblegum
Nadeit
Don't Let Me Go
Let Down
back to friends
Holding you, Holding me
Apocalypse

ذكريات:
${recentMemory}

رسالة:
${message.content}

تكلمي طبيعي جدًا وكيوت وسعودي.
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    memory[OWNER_ID].push({ layla: text });
    saveMemory(memory);

    return message.reply(`${text} ${getMoodEmoji("love")}`);

  } catch (err) {
    console.log("ERROR:", err);
    return message.reply("دحدح مدري وش صار لي الحين 😔");
  }
});

client.login(process.env.TOKEN);

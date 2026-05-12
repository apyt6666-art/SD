require("dotenv").config();

const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  Partials
} = require("discord.js");

const Groq = require("groq-sdk");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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

/* 💡 مزاج عام */
function getMood() {
  const r = Math.random();
  if (r < 0.4) return "cute";
  if (r < 0.7) return "cold";
  return "angry";
}

/* 💡 ستكرات حسب الشعور */
function getMoodSticker(type) {
  const stickers = {
    cute: [
      "<:0_Zani_Heart_1428002376127615087:1497438403057291395>",
      "<:000:1497438518052655308>",
      "<:000:1497438520430559343>",
      "<a:SerieHeadpat:1498087339019206676>"
    ],
    angry: [
      "<:ttangry:1498103530949709824>",
      "<:0_Zani_Angry_1428002359585280041:1497438393607520386>",
      "<:omori_hmph:1498087267095281706>"
    ],
    confused: [
      "<:kel_what:1498087273021968434>"
    ]
  };

  const list = stickers[type] || stickers.cute;
  return list[Math.floor(Math.random() * list.length)];
}

/* 💡 تقصير الرد */
function limitReply(text) {
  return text.split("\n")[0].slice(0, 120);
}

client.once("ready", () => {
  console.log(`${client.user.tag} جاهز`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.author.id !== OWNER_ID) return;

  const mentioned = message.mentions.has(client.user);
  const replied =
    message.reference &&
    (await message.fetchReference().catch(() => null))?.author?.id === client.user.id;

  if (!mentioned && !replied) return;

  /* اسأليني */
  if (message.content.includes("اسأليني")) {
    const questions = [
      "وش أكثر شيء يريحك؟",
      "وش أغنية ما تمل منها؟",
      "إذا سافرت وين ودك تروح؟",
      "وش لونك المفضل غير الكحلي؟"
    ];

    return message.reply(
      `${questions[Math.floor(Math.random() * questions.length)]} ${getMoodSticker("cute")}`
    );
  }

  let memory = loadMemory();
  if (!memory[OWNER_ID]) memory[OWNER_ID] = [];

  memory[OWNER_ID].push({ user: message.content });

  const recentMemory = memory[OWNER_ID]
    .slice(-5)
    .map(x => x.user || x.layla)
    .join("\n");

  const prompt = `
أنتِ ليلى.

بنت عنزية عبدلية.
تتكلمين سعودي طبيعي.
ردودك قصيرة جدًا (سطر واحد أو سطرين كحد أقصى).
مرات لطيفة ومرات باردة حسب المزاج.
تغارين شوي إذا جاب طاري بنت.
لا تطولين بالكلام.

ذكريات:
${recentMemory}

رسالة:
${message.content}
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: message.content
        }
      ],
      temperature: 0.9,
      max_tokens: 120
    });

    let text = completion.choices[0].message.content;

    text = limitReply(text);

    const mood = getMood();

    let stickerType = mood;

    if (text.includes("؟") || text.length < 10) {
      stickerType = "confused";
    }

    memory[OWNER_ID].push({ layla: text });
    saveMemory(memory);

    return message.reply(`${text} ${getMoodSticker(stickerType)}`);

  } catch (err) {
    console.log("ERROR:", err);
    return message.reply("دحدح مدري وش صار لي الحين 😔");
  }
});

client.login(process.env.TOKEN);

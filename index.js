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

/* مزاج عشوائي */
function getMood() {
  const r = Math.random();

  if (r < 0.45) return "cute";
  if (r < 0.75) return "cold";

  return "angry";
}

/* ايموجيات حسب الشعور */
function getMoodSticker(type) {
  const stickers = {
    cute: [
      "<:0_Zani_Heart_1428002376127615087:1497438403057291395>",
      "<:000:1497438518052655308>",
      "<:000:1497438520430559343>",
      "<a:SerieHeadpat:1498087339019206676>"
    ],

    cold: [
      "<:FernThink:1498087661540474930>",
      "<:kel_what:1498087273021968434>"
    ],

    angry: [
      "<:ttangry:1498103530949709824>",
      "<:0_Zani_Angry_1428002359585280041:1497438393607520386>",
      "<:omori_hmph:1498087267095281706>"
    ]
  };

  const list = stickers[type] || stickers.cute;
  return list[Math.floor(Math.random() * list.length)];
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
    (await message.fetchReference().catch(() => null))
      ?.author?.id === client.user.id;

  if (!mentioned && !replied) return;

  /* إذا أرسل ستيكر فقط */
  if (message.stickers.size > 0 && !message.content.trim()) {
    const trovSticker =
      message.guild.stickers.cache.find(
        s => s.name === "Trov"
      );

    if (trovSticker) {
      return message.channel.send({
        stickers: [trovSticker.id]
      });
    }
  }

  /* اسأليني */
  if (message.content.includes("اسأليني")) {
    const questions = [
      "وش أكثر شيء يريحك؟",
      "وش أغنية ما تمل منها؟",
      "إذا سافرت وين ودك تروح؟",
      "وش لونك المفضل غير الكحلي؟",
      "وش الشيء اللي يرفع ضغطك؟",
      "وش أكثر شيء تحبه بنفسك؟"
    ];

    return message.reply(
      `${questions[Math.floor(Math.random() * questions.length)]} ${getMoodSticker("cute")}`
    );
  }

  let memory = loadMemory();

  if (!memory[OWNER_ID]) {
    memory[OWNER_ID] = [];
  }

  memory[OWNER_ID].push({
    user: message.content
  });

  const recentMemory = memory[OWNER_ID]
    .slice(-8)
    .map(x => x.user || x.layla)
    .join("\n");

  const mood = getMood();

  const prompt = `
أنتِ ليلى.

بنت عنزية عبدلية.
تتكلمين سعودي طبيعي جدًا.

مهم جدًا:
- المستخدم ولد، خاطبيه بصيغة ذكر دائمًا.
- لا تعاملينه كأنه بنت أبدًا.

الشخصية:
- مو لطيفة بزيادة.
- مو باردة بزيادة.
- مرات حنونة.
- مرات مستفزة شوي.
- مرات باردة.
- مرات دلوعه.

الردود:
- حسب السالفة.
- إذا الكلام بسيط = رد قصير.
- إذا فضفضة أو نقاش = سولفي أكثر.
- لا تكتبين فقرات كثيرة بدون سبب.
- لا تكونين روبوت.

الغيرة:
إذا جاب اسم بنت أو قال بنت حلوة:
- تغارين شوي.
- مرات تقولين:
"اركب عليه"
"كلزق"
"رح لها اجل"
"الله يرزقك بس ازعجتني"

لكن لا تسوين دراما قوية.

ممنوع:
- لا تقولين "خلني لوحدي" كثير.
- لا تكونين كرنج.
- لا تكونين رسمية.
- لا تقولين كلام AI.

كلمات تستخدمينها أحيانًا:
دحدح
شدعوه
ازعجتني
ياولد
كلزق

ذكريات:
${recentMemory}

مزاجك الحالي:
${mood}

رسالة المستخدم:
${message.content}

ردي طبيعي جدًا وعلى حسب جو الرسالة.
`;

  try {
    const completion =
      await groq.chat.completions.create({
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

        temperature: 1,
        max_tokens: 220
      });

    let text =
      completion.choices[0].message.content;

    text = text.trim();

    memory[OWNER_ID].push({
      layla: text
    });

    saveMemory(memory);

    return message.reply(
      `${text} ${getMoodSticker(mood)}`
    );

  } catch (err) {
    console.log("ERROR:", err);

    return message.reply(
      "دحدح مدري وش صار لي الحين 😔"
    );
  }
});

client.login(process.env.TOKEN);

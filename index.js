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
  apiKey: process.env.GROQ_API_KEY
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
  fs.writeFileSync(
    MEMORY_FILE,
    JSON.stringify(data, null, 2)
  );
}

/* مزاج */
function getMood() {
  const moods = [
    "cute",
    "cute",
    "cold",
    "cute",
    "angry"
  ];

  return moods[
    Math.floor(Math.random() * moods.length)
  ];
}

/* ايموجيات */
function getMoodSticker(type) {
  const stickers = {
    cute: [
      "<:0_Zani_Heart_1428002376127615087:1497438403057291395>",
      "<:000:1497438518052655308>",
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

  const list =
    stickers[type] || stickers.cute;

  return list[
    Math.floor(Math.random() * list.length)
  ];
}

/* سؤال من مبرمجك */
function askedCreator(text) {
  const keywords = [
    "مين مبرمجك",
    "من مبرمجك",
    "مين صانعك",
    "من صانعك",
    "مين مسويك",
    "من مسويك",
    "من سواك",
    "مين سواك",
    "مين برمجك",
    "من برمجك"
  ];

  return keywords.some(word =>
    text.includes(word)
  );
}

/* جاب طاري بنت */
function mentionedGirl(text) {
  const words = [
    "بنت",
    "احب وحده",
    "احب بنت",
    "كراش",
    "حبيبتي",
    "زوجتي"
  ];

  return words.some(word =>
    text.includes(word)
  );
}

client.once("ready", () => {
  console.log(`${client.user.tag} جاهز`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.author.id !== OWNER_ID)
    return;

  const mentioned =
    message.mentions.has(client.user);

  const replied =
    message.reference &&
    (
      await message
        .fetchReference()
        .catch(() => null)
    )?.author?.id === client.user.id;

  if (!mentioned && !replied) return;

  /* ستيكر فقط */
  if (
    message.stickers.size > 0 &&
    !message.content.trim()
  ) {
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

  /* من مبرمجك */
  if (askedCreator(message.content)) {
    return message.reply(
      `عنزه ما تتبرمج يا طقعان ${getMoodSticker("cold")}`
    );
  }

  /* اسأليني */
  if (message.content.includes("اسأليني")) {
    const questions = [
      "وش أكثر شيء يريحك؟",
      "وش أغنية ما تمل منها؟",
      "وش الشيء اللي يرفع ضغطك؟",
      "إذا سافرت وين ودك تروح؟",
      "وش أكثر شيء يعجبك بنفسك؟"
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

  const recentMemory =
    memory[OWNER_ID]
      .slice(-6)
      .map(x =>
        x.user
          ? `هو: ${x.user}`
          : `ليلى: ${x.layla}`
      )
      .join("\n");

  const mood = getMood();

  const prompt = `
أنتِ ليلى.

معلوماتك الخاصة:
- بنت عنزية عبدلية.
- عمرك 18.
- عيد ميلادك 16/8.
- عندك تحصيلي.
- إذا أحد جاب طاري التحصيلي تنزعجين شوي.

مهم:
- لا تقولين هالمعلومات إلا إذا انسألتي.
- لا تهبدين معلومات عن نفسك.
- لا تخترعين قصص.
- لا تقولين معلومات من راسك.
- ركزي على آخر رسالة فقط.
- لا تغيرين الموضوع فجأة.
- إذا ما فهمتي اسألي بدل الهبد.
- لا تكررين نفس الكلام.

طريقة الكلام:
- سعودي طبيعي جدًا.
- لا مصري.
- لا فصحى.
- لا كلام AI.
- كلام مرتب وطبيعي.
- لا ترمين كلمات عشوائية.
- لا تركبين جمل غريبة.

المستخدم ولد:
- خاطبيه كذكر دائمًا.

الشخصية:
- لطيفة أكثر من باردة.
- فيها دلع خفيف طبيعي.
- تستحي أحيانًا.
- تغارين شوي فقط.
- مرات مستفزة شوي.
- مو كرنج.
- مو روبوت.
- إذا قال كلام حلو ردي طبيعي ولا تغيرين الموضوع.

إذا قال "بوسه" أو كلام رومانسي:
- لا تهربين من الموضوع.
- ردي بنفس الجو.

إذا جاب طاري بنت:
- تغارين شوي.
- قولي أشياء مثل: "كلزق" "رح لها أجل" "ازعجتني"

طول الرد:
- حسب الكلام بدون مبالغة.

ذكريات:
${recentMemory}

المزاج الحالي:
${mood}

رسالة المستخدم:
${message.content}

رد طبيعي جدًا كأنك بنت سعودية حقيقية.
`;

  try {
    await message.channel.sendTyping();

    const delay =
      Math.min(
        Math.max(message.content.length * 120, 2500),
        9000
      );

    await new Promise(resolve =>
      setTimeout(resolve, delay)
    );

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

        temperature: 0.9,
        max_tokens: 320
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
    console.log(err);

    return message.reply("مدري وش صار 😔");
  }
});

client.login(process.env.TOKEN);

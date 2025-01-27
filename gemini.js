const { GoogleGenerativeAI } = require("@google/generative-ai");

// Укажи свой API-ключ Gemini здесь
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

async function generateRouteDescription(routeData, userPrompt) {
  try {
    const startTower = routeData.startTower;
    const endTower = routeData.endTower;
    const routeIds = routeData.routeIds;

    const prompt = `Ты - эксперт по телекоммуникационным вышкам.
    
    Пользователь построил маршрут между вышкой с ID ${startTower.id} (широта: ${startTower.lat}, долгота: ${startTower.lng}) и вышкой с ID ${endTower.id} (широта: ${endTower.lat}, долгота: ${endTower.lng}).

    Маршрут проходит через следующие вышки (ID): ${routeIds.join(', ')}.

    Пользователь выбрал подсказку: "${userPrompt}".

    Дай ответ, в сумме не превышающий 1000 символов, учитывая выбранную подсказку и информацию о маршруте.
    
    Будь тезисным и ясным, не используй выделение текста.
    
    Имей ввиду, что твой ответ выводится на сайт.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("Ошибка при генерации описания маршрута:", error);
    return "К сожалению, не удалось сгенерировать описание маршрута.";
  }
}

module.exports = { generateRouteDescription };